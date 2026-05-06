import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirestoreDb } from '@/lib/firestore'
import { isAuthorizedService } from '@/lib/ai-threads'

interface RouteCtx { params: Promise<{ threadId: string }> }

/** GET /api/ai-threads/:threadId */
export async function GET(req: NextRequest, { params }: RouteCtx) {
  if (!isAuthorizedService(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const doc = await db.collection('aiThreads').doc(threadId).get()
  if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ thread: { id: doc.id, ...doc.data() } })
}

/**
 * PATCH /api/ai-threads/:threadId
 *
 * Partial update — typical use is mapping fields (projectId, clientId,
 * repoURL) or moving status/visibility. Whitelisted keys only.
 */
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  if (!isAuthorizedService(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedKeys = new Set([
    'title',
    'summary',
    'projectId',
    'clientId',
    'repoURL',
    'workspacePath',
    'parentThreadId',
    'visibility',
    'status',
    'capabilities',
    'lastActivityAt',
    'messageCount',
    'artifactCount',
    'confidence',
    'gitBranch',
    'model',
  ])
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
  for (const [key, value] of Object.entries(body)) {
    if (allowedKeys.has(key)) update[key] = value
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No allowed fields in payload' }, { status: 400 })
  }

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const ref = db.collection('aiThreads').doc(threadId)
  const existing = await ref.get()
  if (!existing.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await ref.set(update, { merge: true })
  return NextResponse.json({ ok: true })
}

/** DELETE /api/ai-threads/:threadId */
export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  if (!isAuthorizedService(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  // Delete subcollections first.
  const ref = db.collection('aiThreads').doc(threadId)
  const messages = await ref.collection('messages').listDocuments()
  const artifacts = await ref.collection('artifacts').listDocuments()
  const batch = db.batch()
  messages.forEach((d) => batch.delete(d))
  artifacts.forEach((d) => batch.delete(d))
  batch.delete(ref)
  await batch.commit()

  return NextResponse.json({ ok: true })
}
