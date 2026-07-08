import { type NextRequest, NextResponse } from "next/server"

import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import {
  buildCanonicalWorkspaceAudit,
  repairCanonicalWorkspaceModel,
} from "@/lib/admin/workspace-canonical"

export const dynamic = "force-dynamic"

function readLimit(request: NextRequest) {
  return Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "1000", 10) || 1000, 2000)
}

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const data = await buildCanonicalWorkspaceAudit(db, readLimit(request))
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("GET /api/admin/workspaces/canonical:", error)
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
    const dryRun = body.dryRun !== false
    const limit = Math.min(
      typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : 1000,
      2000
    )
    const data = await repairCanonicalWorkspaceModel(db, { dryRun, limit })

    await writeAuditLog({
      collection: "workspaces",
      docId: "canonical-model",
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: {
        operation: "canonical-workspace-repair",
        dryRun,
        limit,
        workspaceSlugWrites: data.workspaceSlugWrites.length,
        workspaceClientWrites: data.workspaceClientWrites.length,
        clientWorkspaceIdsWrites: data.clientWorkspaceIdsWrites.length,
        childRepairs: data.childRepairs.reduce((sum, repair) => sum + repair.total, 0),
      },
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("POST /api/admin/workspaces/canonical:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
