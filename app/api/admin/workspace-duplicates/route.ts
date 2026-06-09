import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import {
  applyWorkspaceDuplicateMergePlan,
  buildWorkspaceDuplicateAudit,
  buildWorkspaceDuplicateMergePlan,
} from "@/lib/admin/workspace-duplicates"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "500", 10) || 500, 1000)
    const data = await buildWorkspaceDuplicateAudit(db, limit)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("GET /api/admin/workspace-duplicates:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const canonicalWorkspaceId = typeof body.canonicalWorkspaceId === "string" ? body.canonicalWorkspaceId.trim() : ""
    const duplicateWorkspaceIds = Array.isArray(body.duplicateWorkspaceIds)
      ? body.duplicateWorkspaceIds.filter((id): id is string => typeof id === "string")
      : []
    const dryRun = body.dryRun !== false

    if (!canonicalWorkspaceId || duplicateWorkspaceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "canonicalWorkspaceId and duplicateWorkspaceIds are required" },
        { status: 400 }
      )
    }

    const plan = await buildWorkspaceDuplicateMergePlan({
      db,
      canonicalWorkspaceId,
      duplicateWorkspaceIds,
      dryRun,
    })

    if (!dryRun) {
      await applyWorkspaceDuplicateMergePlan(db, plan)
    }

    return NextResponse.json({ success: true, data: { ...plan, applied: !dryRun } })
  } catch (error) {
    console.error("POST /api/admin/workspace-duplicates:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
