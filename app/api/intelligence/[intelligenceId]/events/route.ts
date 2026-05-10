import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"

type Params = { params: Promise<{ intelligenceId: string }> }

/**
 * GET /api/intelligence/[intelligenceId]/events
 *
 * Reads the `events` subcollection under ragIntelligence/{intelligenceId}.
 * Events are ordered newest-first.
 */
export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { intelligenceId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    // Verify parent document exists
    const parent = await db.collection("ragIntelligence").doc(intelligenceId).get()
    if (!parent.exists) {
      return NextResponse.json(
        { success: false, error: "Intelligence record not found" },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200)

    const snap = await db
      .collection("ragIntelligence")
      .doc(intelligenceId)
      .collection("events")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    })
  } catch (err) {
    console.error("GET /api/intelligence/[intelligenceId]/events:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
