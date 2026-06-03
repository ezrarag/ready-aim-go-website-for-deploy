import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirestoreDb } from '@/lib/firestore'
import { isAuthorizedService, validateMessageInput } from '@/lib/ai-threads'

interface RouteCtx { params: Promise<{ threadId: string }> }

/**
 * GET /api/ai-threads/:threadId/messages?limit=200&order=asc|desc
 *
 * Lists messages for a thread. By default returns oldest first so the
 * caller can render them in chronological order.
 */
export async function GET(req: NextRequest, { params }: RouteCtx) {
  if (!isAuthorizedService(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') ?? '200') || 200))
  const order = url.searchParams.get('order') === 'desc' ? 'desc' : 'asc'

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const snap = await db
    .collection('aiThreads')
    .doc(threadId)
    .collection('messages')
    .orderBy('sourceOffset', order)
    .limit(limit)
    .get()

  return NextResponse.json({
    messages: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    count: snap.size,
  })
}

/**
 * POST /api/ai-threads/:threadId/messages
 *
 * Append one or more messages. Idempotent on `id` — replays update in
 * place. Useful for raCommand to upload an explicitly-imported
 * transcript or for shadow-chat continuations to persist new turns.
 *
 * Body: { messages: AIThreadMessageDTO[] } OR a single message DTO.
 */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  if (!isAuthorizedService(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawMessages = Array.isArray((body as { messages?: unknown }).messages)
    ? ((body as { messages: unknown[] }).messages)
    : [body]

  const validated = rawMessages
    .map((m) => validateMessageInput(threadId, m))
    .filter((m): m is NonNullable<typeof m> => m !== null)

  if (validated.length === 0) {
    return NextResponse.json({ error: 'No valid messages in payload' }, { status: 400 })
  }

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const threadRef = db.collection('aiThreads').doc(threadId)
  // Confirm thread exists so we don't create orphaned messages.
  const threadDoc = await threadRef.get()
  if (!threadDoc.exists) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  // Firestore batch writes cap at 500.  Slice if a caller pushes more than that.
  const chunks: typeof validated[] = []
  for (let i = 0; i < validated.length; i += 400) {
    chunks.push(validated.slice(i, i + 400))
  }

  for (const chunk of chunks) {
    const batch = db.batch()
    for (const msg of chunk) {
      batch.set(
        threadRef.collection('messages').doc(msg.id),
        { ...msg, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
    }
    await batch.commit()
  }

  // Bump the parent thread's lastActivityAt + messageCount.
  await threadRef.set(
    {
      lastActivityAt: validated.reduce<string | null>((latest, m) => {
        if (!m.createdAt) return latest
        if (!latest) return m.createdAt
        return m.createdAt > latest ? m.createdAt : latest
      }, null),
      messageCount: FieldValue.increment(validated.length),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return NextResponse.json({ ok: true, written: validated.length })
}
