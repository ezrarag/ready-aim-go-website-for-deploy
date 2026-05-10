import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

// Firestore collection: "projectTasks"
// Valid task statuses (superset — matches Step 5 fix)
const VALID_STATUSES = new Set([
  "proposed", "accepted", "in_progress", "blocked", "done", "declined",
])

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const clientId = searchParams.get("clientId")
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200)

    let query: FirebaseFirestore.Query = db.collection("projectTasks")
    if (projectId) query = query.where("projectId", "==", projectId)
    if (clientId) query = query.where("clientId", "==", clientId)
    if (status && VALID_STATUSES.has(status)) query = query.where("status", "==", status)
    const snap = await query.limit(limit).get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    })
  } catch (err) {
    console.error("GET /api/admin/tasks:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
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

    const body = (await request.json()) as Record<string, unknown>
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 })
    }

    const rawStatus = typeof body.status === "string" ? body.status : "proposed"
    const status = VALID_STATUSES.has(rawStatus) ? rawStatus : "proposed"

    const now = new Date().toISOString()
    const payload = { ...body, title, status, createdAt: now, updatedAt: now }
    const ref = await db.collection("projectTasks").add(payload)

    await writeAuditLog({
      collection: "projectTasks",
      docId: ref.id,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { title, status, projectId: body.projectId, clientId: body.clientId },
    })

    return NextResponse.json({ success: true, data: { id: ref.id, ...payload } })
  } catch (err) {
    console.error("POST /api/admin/tasks:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
