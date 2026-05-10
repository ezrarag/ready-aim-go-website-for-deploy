import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirestoreDb } from '@/lib/firestore'

// Set INTELLIGENCE_SYNC_SECRET in your environment.
// Producers send it as: X-Intelligence-Secret: <value>
const SYNC_SECRET = process.env.INTELLIGENCE_SYNC_SECRET

type IntelligenceSource = 'claude_chat' | 'codex' | 'api'

interface SyncPayload {
  threadId: string
  source: IntelligenceSource
  summary: string
  decisions?: unknown[]
  tasks?: unknown[]
  relatedClientId?: string
  relatedProjectId?: string
  createdAt?: string
}

const VALID_SOURCES: IntelligenceSource[] = ['claude_chat', 'codex', 'api']

function producerFromSource(source: IntelligenceSource) {
  switch (source) {
    case 'claude_chat': return 'claude_ai'
    case 'codex': return 'codex'
    case 'api': return 'anthropic_api'
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const incoming = req.headers.get('x-intelligence-secret')
  if (!SYNC_SECRET || incoming !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse ────────────────────────────────────────────────────────────────────
  let body: SyncPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    threadId,
    source,
    summary,
    decisions = [],
    tasks = [],
    relatedClientId,
    relatedProjectId,
  } = body

  // ── Validate ─────────────────────────────────────────────────────────────────
  if (!threadId || typeof threadId !== 'string' || !threadId.trim()) {
    return NextResponse.json({ error: 'threadId is required' }, { status: 400 })
  }
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: `source must be one of: ${VALID_SOURCES.join(', ')}` },
      { status: 400 }
    )
  }
  if (!summary || typeof summary !== 'string' || !summary.trim()) {
    return NextResponse.json({ error: 'summary is required' }, { status: 400 })
  }
  if (!Array.isArray(decisions) || !Array.isArray(tasks)) {
    return NextResponse.json(
      { error: 'decisions and tasks must be arrays' },
      { status: 400 }
    )
  }

  // ── Database ─────────────────────────────────────────────────────────────────
  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const safeId = threadId.trim()
  const docRef = db.collection('ragIntelligence').doc(safeId)
  const eventRef = docRef.collection('events').doc()
  const auditRef = db.collection('auditLog').doc()
  const now = FieldValue.serverTimestamp()
  const producer = producerFromSource(source)

  let isNew = false
  try {
    const existing = await docRef.get()
    isNew = !existing.exists
  } catch (e) {
    console.error('ragIntelligence existence check failed:', e)
    return NextResponse.json({ error: 'Database read failed' }, { status: 503 })
  }

  const intelligenceFields = {
    kind: 'conversation_summary',
    source: {
      producer,
      model: null,
      conversationId: null,
      sessionId: null,
      messageId: null,
      runId: null,
      sourceUrl: null,
    },
    subject: {
      clientId: relatedClientId ?? null,
      projectId: relatedProjectId ?? null,
      repoId: null,
      intakeId: null,
      feedbackId: null,
      taskIds: [],
    },
    visibility: 'internal',
    // Use first 160 chars of the summary as the display title.
    title: summary.trim().slice(0, 160),
    summary: summary.trim(),
    structured: {
      decisions,
      tasks,
      risks: [],
      openQuestions: [],
      recommendations: [],
      citations: [],
    },
    rawExcerpt: null,
    confidence: 1.0,
    status: 'active',
    // idempotencyKey doubles as the document id so replays update in-place.
    idempotencyKey: safeId,
    schemaVersion: 1,
    updatedAt: now,
  }

  const batch = db.batch()

  if (isNew) {
    batch.set(docRef, { ...intelligenceFields, createdAt: now })
  } else {
    batch.set(docRef, intelligenceFields, { merge: true })
  }

  batch.set(eventRef, {
    type: isNew ? 'created' : 'updated',
    actor: { surface: 'claudeIntelligence', serviceId: producer },
    summary: summary.trim().slice(0, 300),
    createdAt: now,
  })

  batch.set(auditRef, {
    actor: { surface: 'claudeIntelligence', serviceId: producer },
    action: isNew ? 'ragIntelligence.create' : 'ragIntelligence.update',
    target: { collection: 'ragIntelligence', documentId: safeId },
    createdAt: now,
  })

  try {
    await batch.commit()
  } catch (e) {
    console.error('ragIntelligence batch write failed:', e)
    return NextResponse.json({ error: 'Write failed' }, { status: 503 })
  }

  return NextResponse.json({ ok: true, id: safeId, isNew }, { status: isNew ? 201 : 200 })
}
