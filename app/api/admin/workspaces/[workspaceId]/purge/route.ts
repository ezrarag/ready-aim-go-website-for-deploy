import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { applyWorkspacePurgePlan, buildWorkspacePurgePlan } from "@/lib/admin/workspace-purge"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string }> }

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { workspaceId } = await context.params
  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

  const plan = await buildWorkspacePurgePlan(db, decodeURIComponent(workspaceId), true)
  return NextResponse.json({ success: true, data: plan })
}

export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { workspaceId } = await context.params
  const id = decodeURIComponent(workspaceId)
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const confirmWorkspaceId = typeof body.confirmWorkspaceId === "string" ? body.confirmWorkspaceId.trim() : ""
  const dryRun = body.dryRun === true

  if (confirmWorkspaceId !== id) {
    return NextResponse.json(
      { success: false, error: "confirmWorkspaceId must match the workspace being purged." },
      { status: 400 }
    )
  }

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

  const plan = await buildWorkspacePurgePlan(db, id, dryRun)
  if (!dryRun) {
    await applyWorkspacePurgePlan(db, plan)
  }

  return NextResponse.json({ success: true, data: { ...plan, applied: !dryRun } })
}
