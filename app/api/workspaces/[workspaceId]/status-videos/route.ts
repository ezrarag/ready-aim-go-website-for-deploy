import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { listWorkspaceStatusVideos } from "@/lib/portal-status-videos"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "30", 10) || 30, 100)
    const data = await listWorkspaceStatusVideos(getAdminDb(), workspaceId, limit)

    return NextResponse.json({
      success: true,
      workspaceId,
      candidateClientIds: data.candidates.candidateClientIds,
      videos: data.videos,
    })
  } catch (error) {
    console.error("GET /api/workspaces/[workspaceId]/status-videos:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load status videos." },
      { status: 500 }
    )
  }
}
