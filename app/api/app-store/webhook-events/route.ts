import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json({ success: false, error: "Firebase not initialized", events: [] }, { status: 503 })
  }

  try {
    const snapshot = await db.collection("appStoreWebhookEvents").orderBy("createdAt", "desc").limit(20).get()
    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    })
  } catch (orderError) {
    console.warn("Falling back to unordered App Store webhook events query:", orderError)
    try {
      const snapshot = await db.collection("appStoreWebhookEvents").get()
      const events = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
        .slice(0, 20)

      return NextResponse.json({
        success: true,
        events,
        count: events.length,
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch App Store webhook events",
          events: [],
        },
        { status: 500 }
      )
    }
  }
}
