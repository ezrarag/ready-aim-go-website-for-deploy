import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

/**
 * POST /api/intelligence/ingest
 *
 * Accepts a ragIntelligence payload and upserts it to
 * ragIntelligence/{threadId} in Firestore.
 *
 * Body shape:
 * {
 *   threadId: string          — used as the document ID (idempotent)
 *   source: string            — e.g. "claude-thread" | "zapier" | "api"
 *   summary: string
 *   decisions: string[]
 *   tasks: Array<{ title: string; description?: string; priority?: string }>
 *   relatedClientId?: string
 *   relatedProjectId?: string
 *   schemaVersion: number     — monotonic integer for future migrations
 * }
 */
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>

    const threadId = typeof body.threadId === "string" ? body.threadId.trim() : ""
    if (!threadId) {
      return NextResponse.json({ success: false, error: "threadId is required" }, { status: 400 })
    }

    const source = typeof body.source === "string" ? body.source.trim() : "unknown"
    const summary = typeof body.summary === "string" ? body.summary : ""
    const decisions = Array.isArray(body.decisions)
      ? body.decisions.filter((d): d is string => typeof d === "string")
      : []
    const tasks = Array.isArray(body.tasks) ? body.tasks : []
    const relatedClientId =
      typeof body.relatedClientId === "string" ? body.relatedClientId : null
    const relatedProjectId =
      typeof body.relatedProjectId === "string" ? body.relatedProjectId : null
    const schemaVersion =
      typeof body.schemaVersion === "number" ? body.schemaVersion : 1

    const now = new Date().toISOString()
    const payload = {
      threadId,
      source,
      summary,
      decisions,
      tasks,
      relatedClientId,
      relatedProjectId,
      schemaVersion,
      ingestedAt: now,
      updatedAt: now,
    }

    // Upsert — merge so repeat ingests update without destroying subcollections
    await db.collection("ragIntelligence").doc(threadId).set(payload, { merge: true })

    await writeAuditLog({
      collection: "ragIntelligence",
      docId: threadId,
      action: "ingest",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: {
        source,
        relatedClientId,
        relatedProjectId,
        taskCount: tasks.length,
        schemaVersion,
      },
    })

    return NextResponse.json({ success: true, data: { threadId, ...payload } }, { status: 201 })
  } catch (err) {
    console.error("POST /api/intelligence/ingest:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
