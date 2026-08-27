import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai-threads/sync/claude-compliance
 *
 * Pulls activity logs / chat data from the Claude Enterprise Compliance
 * API (https://support.claude.com/en/articles/13015708) and projects
 * each conversation into the `aiThreads` collection with
 * `source: 'claudeEnterpriseCompliance'`.
 *
 * **NOT YET IMPLEMENTED.** Requires the workspace to be on Claude
 * Enterprise with the Compliance API enabled, and a service token
 * stored as an environment secret.
 *
 * Tracking: Phase 6 follow-up of
 * CLAUDE_CODE_PROMPT_CLAUDE_THREADS_ARCHITECTURE.md.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Not yet implemented',
      requires: 'Claude Enterprise + Compliance API access',
      tracking: 'CLAUDE_CODE_PROMPT_CLAUDE_THREADS_ARCHITECTURE.md',
    },
    { status: 501 }
  )
}
