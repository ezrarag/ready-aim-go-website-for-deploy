import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"

type Params = { params: Promise<{ intelligenceId: string }> }

// GET /api/admin/intelligence/[intelligenceId]
// Reads ragIntelligence/{intelligenceId} plus its events subcollection summary.
export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { intelligenceId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("ragIntelligence").doc(intelligenceId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Intelligence record not found" }, { status: 404 })
    }

    // Optionally include events subcollection
    const { searchParams } = new URL(request.url)
    const includeEvents = searchParams.get("includeEvents") === "true"

    let events: unknown[] = []
    if (includeEvents) {
      const eventsSnap = await db
        .collection("ragIntelligence")
        .doc(intelligenceId)
        .collection("events")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get()
      events = eventsSnap.docs.map((e) => ({ id: e.id, ...e.data() }))
    }

    return NextResponse.json({
      success: true,
      data: { id: doc.id, ...doc.data(), ...(includeEvents ? { events } : {}) },
    })
  } catch (err) {
    console.error("GET /api/admin/intelligence/[intelligenceId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
