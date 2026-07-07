import { type NextRequest, NextResponse } from "next/server"

import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { getFirestoreDb } from "@/lib/firestore"
import { relinkWorkspaceClient } from "@/lib/admin/workspace-frontend"
import {
  healWorkspaceChildClientIds,
  readAdminString,
} from "@/lib/admin/workspace-assets"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const workspaceId = readAdminString(body.workspaceId)
    const clientId = readAdminString(body.clientId)
    const setCanonicalForClient = body.setCanonicalForClient === true

    if (!workspaceId || !clientId) {
      return NextResponse.json(
        { success: false, error: "workspaceId and clientId are required." },
        { status: 400 }
      )
    }

    const relink = await relinkWorkspaceClient(db, workspaceId, clientId, setCanonicalForClient)
    const healedChildMappings = await healWorkspaceChildClientIds(db, workspaceId, clientId)

    await writeAuditLog({
      collection: "workspaces",
      docId: workspaceId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: {
        operation: "link-client",
        previousClientId: relink.previousClientId,
        clientId,
        setCanonicalForClient,
        healedChildMappings,
      },
    })

    return NextResponse.json({
      success: true,
      workspaceId,
      clientId,
      relink,
      healedChildMappings,
    })
  } catch (error) {
    console.error("POST /api/admin/workspaces/link:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
