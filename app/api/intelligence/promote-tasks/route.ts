import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

/**
 * POST /api/intelligence/promote-tasks
 *
 * Reads the `tasks` array from ragIntelligence/{intelligenceId} and writes
 * each task as a projectTasks/{taskId} document with status: "proposed".
 *
 * Body: { intelligenceId: string }
 *
 * Returns the list of created task IDs.
 */
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const intelligenceId = typeof body.intelligenceId === "string" ? body.intelligenceId.trim() : ""
    if (!intelligenceId) {
      return NextResponse.json({ success: false, error: "intelligenceId is required" }, { status: 400 })
    }

    const intelDoc = await db.collection("ragIntelligence").doc(intelligenceId).get()
    if (!intelDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Intelligence record not found" },
        { status: 404 }
      )
    }

    const intelData = intelDoc.data() as Record<string, unknown>
    const rawTasks = Array.isArray(intelData.tasks) ? intelData.tasks : []

    if (rawTasks.length === 0) {
      return NextResponse.json({
        success: true,
        data: { promoted: 0, taskIds: [] },
      })
    }

    const now = new Date().toISOString()
    const batch = db.batch()
    const taskIds: string[] = []

    for (const rawTask of rawTasks) {
      const task = typeof rawTask === "object" && rawTask !== null
        ? (rawTask as Record<string, unknown>)
        : {}

      const ref = db.collection("projectTasks").doc()
      taskIds.push(ref.id)

      batch.set(ref, {
        title: typeof task.title === "string" ? task.title.trim() : "Untitled task",
        description: typeof task.description === "string" ? task.description : "",
        priority: typeof task.priority === "string" ? task.priority : "medium",
        status: "proposed",
        sourceIntelligenceId: intelligenceId,
        relatedClientId: intelData.relatedClientId ?? null,
        relatedProjectId: intelData.relatedProjectId ?? null,
        createdAt: now,
        updatedAt: now,
      })
    }

    await batch.commit()

    await writeAuditLog({
      collection: "projectTasks",
      docId: intelligenceId,
      action: "promote",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { intelligenceId, promoted: taskIds.length, taskIds },
    })

    return NextResponse.json({
      success: true,
      data: { promoted: taskIds.length, taskIds },
    })
  } catch (err) {
    console.error("POST /api/intelligence/promote-tasks:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
