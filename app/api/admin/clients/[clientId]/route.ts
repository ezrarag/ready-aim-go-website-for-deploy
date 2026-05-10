import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

type Params = { params: Promise<{ clientId: string }> }

// GET /api/admin/clients/[clientId]
export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("clients").doc(clientId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } })
  } catch (err) {
    console.error("GET /api/admin/clients/[clientId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/clients/[clientId]
export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const patch = { ...body, updatedAt: new Date().toISOString() }
    // Strip protected fields from caller payload
    delete patch.id
    delete patch.createdAt

    const ref = db.collection("clients").doc(clientId)
    const existing = await ref.get()
    if (!existing.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    await ref.update(patch)

    await writeAuditLog({
      collection: "clients",
      docId: clientId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: patch,
    })

    const updated = await ref.get()
    return NextResponse.json({ success: true, data: { id: updated.id, ...updated.data() } })
  } catch (err) {
    console.error("PATCH /api/admin/clients/[clientId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clients/[clientId] — soft-delete via status: "archived"
export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("clients").doc(clientId)
    const existing = await ref.get()
    if (!existing.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    await ref.update({ status: "archived", updatedAt: new Date().toISOString() })

    await writeAuditLog({
      collection: "clients",
      docId: clientId,
      action: "archive",
      actorKey: extractActorKey(request.headers.get("authorization")),
    })

    return NextResponse.json({ success: true, data: { id: clientId, status: "archived" } })
  } catch (err) {
    console.error("DELETE /api/admin/clients/[clientId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
