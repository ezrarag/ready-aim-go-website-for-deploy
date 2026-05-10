import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

// GET /api/admin/clients — list all client documents
export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200)

    let query: FirebaseFirestore.Query = db.collection("clients")
    if (status) query = query.where("status", "==", status)
    const snap = await query.limit(limit).get()

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("GET /api/admin/clients:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients — create a new client document
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ success: false, error: "name is required" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const payload = { ...body, name, createdAt: now, updatedAt: now }
    const ref = await db.collection("clients").add(payload)

    await writeAuditLog({
      collection: "clients",
      docId: ref.id,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { name },
    })

    return NextResponse.json({ success: true, data: { id: ref.id, ...payload } })
  } catch (err) {
    console.error("POST /api/admin/clients:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
