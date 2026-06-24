/**
 * Shared types and helpers for the /api/ai-threads/* routes.
 *
 * Mirrors raCommand's AIThreadRecord / AIThreadMessageRecord shapes.
 * Persisted in Firestore at:
 *   aiThreads/{threadId}
 *   aiThreads/{threadId}/messages/{messageId}
 *   aiThreads/{threadId}/artifacts/{artifactId}
 */

export const AI_THREAD_SOURCES = [
  'claudeCode',
  'claudeChatExport',
  'claudeChatSharedLink',
  'claudeEnterpriseCompliance',
  'anthropicAPI',
  'codex',
  'manual',
] as const

export type AIThreadSource = (typeof AI_THREAD_SOURCES)[number]

export const AI_THREAD_CAPABILITIES = [
  'canOpenOriginal',
  'canImportTranscript',
  'canImportArtifacts',
  'canResumeOriginal',
  'canShadowChat',
  'canSyncIncrementally',
] as const

export type AIThreadCapability = (typeof AI_THREAD_CAPABILITIES)[number]

export interface AIThreadDTO {
  id: string
  source: AIThreadSource
  externalId?: string | null
  title: string
  summary?: string
  sourceURL?: string | null
  workspacePath?: string | null
  repoURL?: string | null
  clientId?: string | null
  projectId?: string | null
  parentThreadId?: string | null
  lastActivityAt?: string | null
  createdAt?: string | null
  importedAt?: string | null
  messageCount?: number
  artifactCount?: number
  capabilities?: AIThreadCapability[]
  confidence?: number
  model?: string | null
  gitBranch?: string | null
  visibility?: 'internal' | 'client' | 'public'
  status?: 'active' | 'archived' | 'rejected'
}

export interface AIThreadMessageDTO {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  text: string
  createdAt?: string | null
  sourceOffset?: number
  hasToolUse?: boolean
  redactionState?: 'raw' | 'redacted' | 'summarized'
}

/**
 * Validate a service-token header. Producers (raCommand, Codex, etc.)
 * include `X-Intelligence-Secret: <env.INTELLIGENCE_SYNC_SECRET>`.
 *
 * Returns true if the secret is present and matches.
 */
export function isAuthorizedService(headers: Headers): boolean {
  const expected = process.env.INTELLIGENCE_SYNC_SECRET
  if (!expected) return false
  return headers.get('x-intelligence-secret') === expected
}

/**
 * Strict shape check + coercion for an inbound thread DTO. Returns null
 * if the payload is malformed.
 */
export function validateThreadInput(raw: unknown): AIThreadDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.id !== 'string' || !r.id.trim()) return null
  if (typeof r.source !== 'string' || !AI_THREAD_SOURCES.includes(r.source as AIThreadSource)) return null
  if (typeof r.title !== 'string') return null

  const capabilities = Array.isArray(r.capabilities)
    ? r.capabilities.filter(
        (c): c is AIThreadCapability =>
          typeof c === 'string' && AI_THREAD_CAPABILITIES.includes(c as AIThreadCapability)
      )
    : []

  return {
    id: r.id.trim(),
    source: r.source as AIThreadSource,
    externalId: typeof r.externalId === 'string' ? r.externalId : null,
    title: r.title.trim().slice(0, 240),
    summary: typeof r.summary === 'string' ? r.summary.slice(0, 4000) : '',
    sourceURL: typeof r.sourceURL === 'string' ? r.sourceURL : null,
    workspacePath: typeof r.workspacePath === 'string' ? r.workspacePath : null,
    repoURL: typeof r.repoURL === 'string' ? r.repoURL : null,
    clientId: typeof r.clientId === 'string' ? r.clientId : null,
    projectId: typeof r.projectId === 'string' ? r.projectId : null,
    parentThreadId: typeof r.parentThreadId === 'string' ? r.parentThreadId : null,
    lastActivityAt: typeof r.lastActivityAt === 'string' ? r.lastActivityAt : null,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : null,
    importedAt: typeof r.importedAt === 'string' ? r.importedAt : null,
    messageCount: typeof r.messageCount === 'number' ? r.messageCount : 0,
    artifactCount: typeof r.artifactCount === 'number' ? r.artifactCount : 0,
    capabilities,
    confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 1,
    model: typeof r.model === 'string' ? r.model : null,
    gitBranch: typeof r.gitBranch === 'string' ? r.gitBranch : null,
    visibility:
      r.visibility === 'client' || r.visibility === 'public' ? (r.visibility as 'client' | 'public') : 'internal',
    status: r.status === 'archived' || r.status === 'rejected' ? (r.status as 'archived' | 'rejected') : 'active',
  }
}

export function validateMessageInput(threadId: string, raw: unknown): AIThreadMessageDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id.trim()) return null
  if (typeof r.role !== 'string') return null
  if (!['user', 'assistant', 'system', 'tool'].includes(r.role)) return null
  if (typeof r.text !== 'string') return null

  return {
    id: r.id.trim(),
    threadId,
    role: r.role as AIThreadMessageDTO['role'],
    // Hard ceiling per message — protects Firestore document size limits.
    text: r.text.slice(0, 32_000),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : null,
    sourceOffset: typeof r.sourceOffset === 'number' ? r.sourceOffset : undefined,
    hasToolUse: r.hasToolUse === true,
    redactionState:
      r.redactionState === 'redacted' || r.redactionState === 'summarized'
        ? (r.redactionState as 'redacted' | 'summarized')
        : 'raw',
  }
}
