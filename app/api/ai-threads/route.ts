import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirestoreDb } from '@/lib/firestore'
import { isAuthorizedService, validateThreadInput } from '@/lib/ai-threads'

/**
 * GET /api/ai-threads
 *
 * Lists AI threads. Service-authenticated for now; portal/operator
 * scoping arrives with the auth-context helpers (TODO).
 *
 * Query params:
 *   - source     : filter by AIThreadSource
 *   - projectId  : filter by subject project
 *   - clientId   : filter by subject client
 *   - limit      : 1..200 (default 100)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedService(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const url = new URL(req.url)
  const source = url.searchParams.get('source')
  const projectId = url.searchParams.get('projectId')
  const clientId = url.searchParams.get('clientId')
  const limitParam = Number(url.searchParams.get('limit') ?? '100')
  const limit = Math.max(1, Math.min(200, Number.isFinite(limitParam) ? limitParam : 100))

  let q: FirebaseFirestore.Query = db.collection('aiThreads').orderBy('lastActivityAt', 'desc').limit(limit)
  if (source) q = q.where('source', '==', source)
  if (projectId) q = q.where('projectId', '==', projectId)
  if (clientId) q = q.where('clientId', '==', clientId)

  try {
    const snap = await q.get()
    const threads = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ threads, count: threads.length })
  } catch (e) {
    console.error('aiThreads list failed:', e)
    return NextResponse.json({ error: 'Query failed' }, { status: 503 })
  }
}

/**
 * POST /api/ai-threads
 *
 * Idempotent upsert by `id`. Used by raCommand to persist a single
 * thread record. For bulk imports, use
 * /api/ai-threads/import/claude-code-metadata.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedService(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const dto = validateThreadInput(body)
  if (!dto) return NextResponse.json({ error: 'Invalid thread payload' }, { status: 400 })

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const ref = db.collection('aiThreads').doc(dto.id)
  const now = FieldValue.serverTimestamp()
  const existing = await ref.get()
  const isNew = !existing.exists

  await ref.set(
    {
      ...dto,
      updatedAt: now,
      ...(isNew ? { createdServerAt: now } : {}),
    },
    { merge: true }
  )

  return NextResponse.json({ ok: true, id: dto.id, isNew }, { status: isNew ? 201 : 200 })
}
