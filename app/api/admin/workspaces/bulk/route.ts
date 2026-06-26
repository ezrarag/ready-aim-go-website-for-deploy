import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { getSuggestedWorkspacePublicUrl, updateWorkspaceFrontEndSettings } from "@/lib/admin/workspace-frontend"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const workspaceIds = Array.isArray(body.workspaceIds)
    ? body.workspaceIds
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    : []

  if (workspaceIds.length === 0) {
    return NextResponse.json({ success: false, error: "workspaceIds is required." }, { status: 400 })
  }

  const hasShowOnFrontend = typeof body.showOnFrontend === "boolean"
  const useSuggestedPublicUrl = body.useSuggestedPublicUrl === true
  const clearPublicUrl = body.clearPublicUrl === true

  if (!hasShowOnFrontend && !useSuggestedPublicUrl && !clearPublicUrl) {
    return NextResponse.json(
      { success: false, error: "Provide showOnFrontend, useSuggestedPublicUrl, or clearPublicUrl." },
      { status: 400 }
    )
  }

  const results: Array<Record<string, unknown>> = []

  for (const workspaceId of workspaceIds) {
    const ref = db.collection("workspaces").doc(workspaceId)
    const snap = await ref.get()
    if (!snap.exists) {
      results.push({ id: workspaceId, success: false, error: "Workspace not found" })
      continue
    }

    const data = snap.data() as Record<string, unknown>
    const updates: { showOnFrontend?: boolean; publicUrl?: string | null } = {}
    if (hasShowOnFrontend) updates.showOnFrontend = body.showOnFrontend as boolean
    if (clearPublicUrl) updates.publicUrl = null
    if (useSuggestedPublicUrl && !clearPublicUrl) {
      const suggested = getSuggestedWorkspacePublicUrl(data)
      if (suggested) updates.publicUrl = suggested
    }

    try {
      const result = await updateWorkspaceFrontEndSettings(db, workspaceId, updates)
      results.push({ id: workspaceId, success: true, workspace: result })
    } catch (error) {
      results.push({
        id: workspaceId,
        success: false,
        error: error instanceof Error ? error.message : "Unable to update workspace.",
      })
    }
  }

  return NextResponse.json({ success: true, results })
}
