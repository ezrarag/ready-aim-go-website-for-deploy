import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirestoreDb } from '@/lib/firestore'
import { isAuthorizedService, validateThreadInput } from '@/lib/ai-threads'

/**
 * POST /api/ai-threads/import/claude-code-metadata
 *
 * Bulk metadata-only sync from raCommand's ClaudeCodeIndexer.
 *
 * Body: { threads: AIThreadDTO[] }
 *
 * Idempotent on each `thread.id`. Replays update in place so raCommand
 * can call this on every refresh without producing duplicates.
 *
 * **Important:** this endpoint never accepts message text. Transcript
 * content is gated by an explicit user action and uses the
 * /api/ai-threads/:threadId/messages POST instead.
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

  const rawThreads = Array.isArray((body as { threads?: unknown }).threads)
    ? ((body as { threads: unknown[] }).threads)
    : []

  if (rawThreads.length === 0) {
    return NextResponse.json({ error: 'threads array is required' }, { status: 400 })
  }

  const validated = rawThreads
    .map(validateThreadInput)
    .filter((t): t is NonNullable<typeof t> => t !== null)

  if (validated.length === 0) {
    return NextResponse.json({ error: 'No valid thread payloads in array' }, { status: 400 })
  }

  // Reject anything that isn't a Claude Code metadata payload — this route
  // is specifically for the local-transcript indexer.
  const wrongSource = validated.find((t) => t.source !== 'claudeCode')
  if (wrongSource) {
    return NextResponse.json(
      { error: `source must be claudeCode (offender: ${wrongSource.id})` },
      { status: 400 }
    )
  }

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  // Chunk to stay below Firestore's 500-write batch cap.
  let created = 0
  let updated = 0
  for (let i = 0; i < validated.length; i += 400) {
    const chunk = validated.slice(i, i + 400)
    const batch = db.batch()
    const refs = chunk.map((t) => db.collection('aiThreads').doc(t.id))

    // Probe existence so the response can report new vs updated counts.
    const existing = await Promise.all(refs.map((r) => r.get()))
    chunk.forEach((dto, idx) => {
      const isNew = !existing[idx].exists
      if (isNew) created++
      else updated++
      batch.set(
        refs[idx],
        {
          ...dto,
          updatedAt: FieldValue.serverTimestamp(),
          ...(isNew ? { createdServerAt: FieldValue.serverTimestamp() } : {}),
        },
        { merge: true }
      )
    })
    await batch.commit()
  }

  // Audit trail.
  await db.collection('auditLog').doc().set({
    actor: { surface: 'raCommand', serviceId: 'claude_code_indexer' },
    action: 'aiThreads.bulkImport.claudeCodeMetadata',
    target: { collection: 'aiThreads', count: validated.length },
    createdAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ ok: true, created, updated, total: validated.length })
}
