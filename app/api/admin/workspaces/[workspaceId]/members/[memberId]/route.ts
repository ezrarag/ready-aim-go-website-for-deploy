import { FieldValue, type Firestore } from "firebase-admin/firestore"
import { type NextRequest, NextResponse } from "next/server"

import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string; memberId: string }> }

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
}

async function applyUserArchiveCleanup(
  db: Firestore,
  uid: string,
  workspaceId: string,
  clientId: string | null
) {
  const userRef = db.collection("users").doc(uid)
  const userSnap = await userRef.get()
  if (!userSnap.exists) {
    return { archived: false, deletedWorkspaceMember: true, touchedUser: false }
  }

  const data = (userSnap.data() as Record<string, unknown>) || {}
  const nextWorkspaceIds = readStringArray(data.workspaceIds).filter((id) => id !== workspaceId)
  const nextClientIds = clientId
    ? readStringArray(data.clientIds).filter((id) => id !== clientId)
    : readStringArray(data.clientIds)
  const activeClientId = readString(data.client_id)
  const nextMemberships =
    data.memberships && typeof data.memberships === "object" && !Array.isArray(data.memberships)
      ? ({ ...(data.memberships as Record<string, unknown>) })
      : {}

  if (clientId) {
    delete nextMemberships[clientId]
  }

  const remainingMembershipKeys = Object.keys(nextMemberships)
  const shouldArchive = nextWorkspaceIds.length === 0 && nextClientIds.length === 0 && remainingMembershipKeys.length === 0

  const update: Record<string, unknown> = {
    workspaceIds: nextWorkspaceIds,
    clientIds: nextClientIds,
    memberships: nextMemberships,
    updatedAt: new Date().toISOString(),
    archived: shouldArchive,
    status: shouldArchive ? "archived" : data.status ?? "active",
  }

  if (activeClientId && clientId && activeClientId === clientId) {
    update.client_id = nextClientIds[0] || ""
  }
  if (readString(data.assignedWorkspaceId) === workspaceId) {
    update.assignedWorkspaceId = shouldArchive ? FieldValue.delete() : ""
  }

  await userRef.set(update, { merge: true })

  return { archived: shouldArchive, deletedWorkspaceMember: true, touchedUser: true }
}

export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId, memberId } = await context.params
    const id = decodeURIComponent(workspaceId)
    const uid = decodeURIComponent(memberId)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const workspaceRef = db.collection("workspaces").doc(id)
    const memberRef = workspaceRef.collection("members").doc(uid)
    const [workspaceSnap, memberSnap] = await Promise.all([workspaceRef.get(), memberRef.get()])
    if (!workspaceSnap.exists) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
    }
    if (!memberSnap.exists) {
      return NextResponse.json({ success: false, error: "Workspace member not found" }, { status: 404 })
    }

    const workspaceData = (workspaceSnap.data() as Record<string, unknown>) || {}
    const clientId = readString(workspaceData.clientId)

    await memberRef.delete()
    const cleanup = await applyUserArchiveCleanup(db, uid, id, clientId)

    await writeAuditLog({
      collection: "workspaces",
      docId: id,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: {
        archivedMemberUid: uid,
        workspaceId: id,
        clientId,
        userArchived: cleanup.archived,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        workspaceId: id,
        uid,
        archived: cleanup.archived,
      },
    })
  } catch (error) {
    console.error("DELETE /api/admin/workspaces/[workspaceId]/members/[memberId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
