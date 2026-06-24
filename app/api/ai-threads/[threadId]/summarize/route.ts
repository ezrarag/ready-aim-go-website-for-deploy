import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai-threads/:threadId/summarize
 *
 * Generates a durable summary, decisions list, and proposed-tasks list
 * from the thread's messages, then writes a `ragIntelligence` record
 * pointing back to the source thread.
 *
 * **NOT YET IMPLEMENTED.** Tracking under Phase 7 of
 * CLAUDE_CODE_PROMPT_CLAUDE_THREADS_ARCHITECTURE.md.
 *
 * Will reuse the existing `/api/intelligence/sync` write path so that
 * ragIntelligence stays the single distillation feed.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Not yet implemented',
      phase: 7,
      tracking: 'CLAUDE_CODE_PROMPT_CLAUDE_THREADS_ARCHITECTURE.md',
    },
    { status: 501 }
  )
}
