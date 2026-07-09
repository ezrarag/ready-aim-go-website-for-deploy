import { type NextRequest, NextResponse } from "next/server"

import { extractActorKey, writeAuditLog } from "@/lib/audit-log"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

type Params = { params: Promise<{ suggestionId: string }> }

const VALID_STATUSES = new Set([
  "open",
  "acknowledged",
  "accepted",
  "in_progress",
  "declined",
  "done",
])

function readString(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { suggestionId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("clientFeedback").doc(suggestionId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Suggestion not found." }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { id: doc.id, ...(doc.data() ?? {}) } })
  } catch (error) {
    console.error("GET /api/admin/project-suggestions/[suggestionId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { suggestionId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("clientFeedback").doc(suggestionId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Suggestion not found." }, { status: 404 })
    }

    const existing = snap.data() as Record<string, unknown>
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: "admin",
    }

    if ("status" in body) {
      const status = readString(body.status, 120)
      if (!VALID_STATUSES.has(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Use one of: ${Array.from(VALID_STATUSES).join(", ")}` },
          { status: 400 }
        )
      }
      patch.status = status
    }

    if ("adminResponse" in body) {
      patch.adminResponse = readString(body.adminResponse, 12000) || null
      patch.adminRespondedAt = patch.adminResponse ? new Date().toISOString() : null
    }

    let createdTaskId: string | null = null
    if (body.convertToTask === true) {
      const workspaceId = readString(body.workspaceId || existing.workspaceId, 240)
      const clientId = readString(body.clientId || existing.clientId, 240)
      const projectId = readString(body.projectId || existing.projectId, 240)
      const title =
        readString(body.taskTitle, 280) ||
        readString(existing.projectTitle, 280) ||
        readString(existing.summary, 280) ||
        readString(existing.rawText, 280)

      if (!workspaceId || !clientId || !title) {
        return NextResponse.json(
          { success: false, error: "workspaceId, clientId, and a task title are required to convert a suggestion into a task." },
          { status: 400 }
        )
      }

      const taskPayload = {
        title,
        description:
          readString(body.taskDescription, 12000) ||
          readString(existing.rawText, 12000) ||
          readString(existing.summary, 12000) ||
          null,
        summary: readString(existing.summary, 4000) || null,
        status: "proposed",
        workspaceId,
        clientId,
        projectId: projectId || null,
        suggestionId,
        source: "workspace-suggestion",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const taskRef = await db.collection("projectTasks").add(taskPayload)
      createdTaskId = taskRef.id
      patch.taskId = createdTaskId
      patch.taskLinkedAt = new Date().toISOString()
      if (!("status" in body)) {
        patch.status = "accepted"
      }
    }

    await ref.set(patch, { merge: true })

    await writeAuditLog({
      collection: "clientFeedback",
      docId: suggestionId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: {
        ...patch,
        createdTaskId,
      },
    })

    return NextResponse.json({ success: true, taskId: createdTaskId })
  } catch (error) {
    console.error("PATCH /api/admin/project-suggestions/[suggestionId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
