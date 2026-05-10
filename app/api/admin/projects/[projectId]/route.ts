import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

type Params = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("projects").doc(projectId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } })
  } catch (err) {
    console.error("GET /api/admin/projects/[projectId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const patch = { ...body, updatedAt: new Date().toISOString() }
    delete patch.id
    delete patch.createdAt

    const ref = db.collection("projects").doc(projectId)
    if (!(await ref.get()).exists) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    await ref.update(patch)

    await writeAuditLog({
      collection: "projects",
      docId: projectId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: patch,
    })

    const updated = await ref.get()
    return NextResponse.json({ success: true, data: { id: updated.id, ...updated.data() } })
  } catch (err) {
    console.error("PATCH /api/admin/projects/[projectId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("projects").doc(projectId)
    if (!(await ref.get()).exists) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    await ref.update({ status: "archived", updatedAt: new Date().toISOString() })

    await writeAuditLog({
      collection: "projects",
      docId: projectId,
      action: "archive",
      actorKey: extractActorKey(request.headers.get("authorization")),
    })

    return NextResponse.json({ success: true, data: { id: projectId, status: "archived" } })
  } catch (err) {
    console.error("DELETE /api/admin/projects/[projectId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
