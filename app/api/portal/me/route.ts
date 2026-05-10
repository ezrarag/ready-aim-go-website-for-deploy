import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { resolvePortalIdentity } from "@/lib/portal-auth"

// GET /api/portal/me — return the authenticated client's own profile
export async function GET(request: NextRequest) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("clients").doc(identity.activeClientId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Client profile not found" }, { status: 404 })
    }

    // Strip sensitive admin-only fields before returning to portal
    const data = doc.data() as Record<string, unknown>
    const { portalUid: _p, ...safeData } = data

    return NextResponse.json({ success: true, data: { id: doc.id, ...safeData } })
  } catch (err) {
    console.error("GET /api/portal/me:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
