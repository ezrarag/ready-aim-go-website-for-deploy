import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai-threads/import/claude-export
 *
 * Receives a parsed Claude data export bundle (zip/folder content from
 * https://support.claude.com/en/articles/9450526) and persists each
 * conversation as an `AIThreadRecord` with `source: 'claudeChatExport'`.
 *
 * **NOT YET IMPLEMENTED.** Tracking under Phase 4 of
 * CLAUDE_CODE_PROMPT_CLAUDE_THREADS_ARCHITECTURE.md.
 *
 * Implementation needs:
 *  - tolerant export-schema parser with version detection
 *  - secret redaction pass before persistence
 *  - opt-in handling for storing the original export path
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Not yet implemented',
      phase: 4,
      tracking: 'CLAUDE_CODE_PROMPT_CLAUDE_THREADS_ARCHITECTURE.md',
    },
    { status: 501 }
  )
}
