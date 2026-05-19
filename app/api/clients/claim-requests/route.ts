import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const status = request.nextUrl.searchParams.get("status") || "pending"
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10) || 50, 200)
    let query: FirebaseFirestore.Query = db.collection("clientClaimRequests")

    if (status !== "all") {
      query = query.where("status", "==", status)
    }

    const snapshot = await query.limit(limit).get()
    const requests = snapshot.docs
      .map((doc) => serializeFirestoreDocument(doc.id, doc.data()))
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))

    return NextResponse.json({ success: true, requests })
  } catch (error) {
    console.error("GET /api/clients/claim-requests:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
