import { type NextRequest, NextResponse } from "next/server"

import { loadAdminWorkspaceDetail } from "@/lib/admin/workspace-detail"
import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string }> }

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const detail = await loadAdminWorkspaceDetail(getAdminDb(), decodeURIComponent(workspaceId))

    if (!detail) {
      return NextResponse.json({ success: false, error: "Workspace not found." }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: detail })
  } catch (error) {
    console.error("GET /api/admin/workspaces/[workspaceId]/detail:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
