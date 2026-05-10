import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"

// Firestore collection: "ragIntelligence"

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("relatedClientId")
    const projectId = searchParams.get("relatedProjectId")
    const source = searchParams.get("source")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200)

    let query: FirebaseFirestore.Query = db.collection("ragIntelligence")
    if (clientId) query = query.where("relatedClientId", "==", clientId)
    if (projectId) query = query.where("relatedProjectId", "==", projectId)
    if (source) query = query.where("source", "==", source)

    // orderBy createdAt descending if no filters applied (simple path)
    const snap = await query.limit(limit).get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    })
  } catch (err) {
    console.error("GET /api/admin/intelligence:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
