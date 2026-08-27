import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai-threads/:threadId/chat
 *
 * Shadow-chat continuation endpoint. Builds a context window from the
 * parent thread (summary, decisions, recent messages) and forwards the
 * new turn to the Anthropic Messages API. Persists the new turn under a
 * raCommand-owned thread (`source: 'anthropicAPI'`) with
 * `parentThreadId` pointing to the imported source.
 *
 * **NOT YET IMPLEMENTED.** Tracking under Phase 5 of
 * CLAUDE_CODE_PROMPT_CLAUDE_THREADS_ARCHITECTURE.md.
 *
 * Expected request body:
 * ```json
 * {
 *   "message": "Continue from this implementation plan and generate next steps.",
 *   "projectId": "raCommand",
 *   "mode": "ask",
 *   "contextPolicy": {
 *     "includeFullTranscript": false,
 *     "includeSummary": true,
 *     "includeDecisions": true,
 *     "maxRecentMessages": 20
 *   }
 * }
 * ```
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Not yet implemented',
      phase: 5,
      tracking: 'CLAUDE_CODE_PROMPT_CLAUDE_THREADS_ARCHITECTURE.md',
    },
    { status: 501 }
  )
}
