import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

type Params = { params: Promise<{ taskId: string }> }

const VALID_STATUSES = new Set([
  "proposed", "accepted", "in_progress", "blocked", "done", "declined",
])

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { taskId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("projectTasks").doc(taskId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } })
  } catch (err) {
    console.error("GET /api/admin/tasks/[taskId]:", err)
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

  const { taskId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    delete body.id
    delete body.createdAt

    // Validate status if provided
    if (typeof body.status === "string") {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}`,
          },
          { status: 400 }
        )
      }
      patch.status = body.status
    }

    // Copy other allowed fields
    const allowed = ["title", "description", "priority", "assigneeId", "projectId", "clientId", "dueDate", "sourceIntelligenceId"]
    for (const key of allowed) {
      if (body[key] !== undefined) patch[key] = body[key]
    }

    const ref = db.collection("projectTasks").doc(taskId)
    if (!(await ref.get()).exists) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    await ref.update(patch)

    await writeAuditLog({
      collection: "projectTasks",
      docId: taskId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: patch,
    })

    const updated = await ref.get()
    return NextResponse.json({ success: true, data: { id: updated.id, ...updated.data() } })
  } catch (err) {
    console.error("PATCH /api/admin/tasks/[taskId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
