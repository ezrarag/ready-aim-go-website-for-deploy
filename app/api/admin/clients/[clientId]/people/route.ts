import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ clientId: string }> }

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/**
 * POST /api/admin/clients/[clientId]/people  — assign a signed-in user to this client.
 * Body: { uid }
 *
 * Writes the link the admin hub reads (users/{uid}.clientIds, and client_id as the
 * active client when the user has none). Also links the client's workspace if present.
 */
export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const uid = readString(body.uid)
    if (!uid) {
      return NextResponse.json({ success: false, error: "uid is required" }, { status: 400 })
    }

    const userRef = db.collection("users").doc(uid)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const clientSnap = await db.collection("clients").doc(clientId).get()
    if (!clientSnap.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }
    const workspaceId = readString((clientSnap.data() as Record<string, unknown>).workspaceId)
    const now = new Date().toISOString()

    const update: Record<string, unknown> = {
      clientIds: FieldValue.arrayUnion(clientId),
      updatedAt: now,
    }
    if (!readString((userSnap.data() as Record<string, unknown>).client_id)) {
      update.client_id = clientId
    }
    if (workspaceId) {
      update.workspaceIds = FieldValue.arrayUnion(workspaceId)
    }

    await userRef.update(update)

    await writeAuditLog({
      collection: "users",
      docId: uid,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { assignedClientId: clientId },
    })

    return NextResponse.json({ success: true, data: { uid, clientId } })
  } catch (err) {
    console.error("POST /api/admin/clients/[clientId]/people:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/clients/[clientId]/people  — unassign a user from this client.
 * Body: { uid }
 */
export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const uid = readString(body.uid)
    if (!uid) {
      return NextResponse.json({ success: false, error: "uid is required" }, { status: 400 })
    }

    const userRef = db.collection("users").doc(uid)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const now = new Date().toISOString()
    const update: Record<string, unknown> = {
      clientIds: FieldValue.arrayRemove(clientId),
      updatedAt: now,
    }
    // Clear the active client pointer if it was this client.
    if (readString((userSnap.data() as Record<string, unknown>).client_id) === clientId) {
      update.client_id = ""
    }

    await userRef.update(update)

    await writeAuditLog({
      collection: "users",
      docId: uid,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { unassignedClientId: clientId },
    })

    return NextResponse.json({ success: true, data: { uid, clientId } })
  } catch (err) {
    console.error("DELETE /api/admin/clients/[clientId]/people:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
