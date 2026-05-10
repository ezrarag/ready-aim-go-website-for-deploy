import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { resolvePortalIdentity } from "@/lib/portal-auth"

// GET /api/portal/projects — return the client's own projects
export async function GET(request: NextRequest) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100)

    // Support multi-client users: query all allowed clientIds (Firestore `in` limit is 30)
    const clientIds = identity.clientIds.slice(0, 30)
    let query: FirebaseFirestore.Query =
      clientIds.length === 1
        ? db.collection("projects").where("clientId", "==", clientIds[0])
        : db.collection("projects").where("clientId", "in", clientIds)
    if (status) query = query.where("status", "==", status)

    const snap = await query.limit(limit).get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    })
  } catch (err) {
    console.error("GET /api/portal/projects:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
