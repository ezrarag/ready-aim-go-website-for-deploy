import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isBeamRequestAuthorized } from "@/lib/beam-api"

export const dynamic = "force-dynamic"

// Online threshold: users seen within 5 minutes are considered active.
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

function toIso(value: unknown): string {
  if (!value) return new Date(0).toISOString()
  if (typeof value === "string") return value
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return new Date(0).toISOString()
}

export async function GET(request: NextRequest) {
  const authorized = await isBeamRequestAuthorized(request)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const db = getAdminDb()

    // Fetch users that have a lastSeenAt field (portal users who've signed in).
    const snapshot = await db
      .collection("users")
      .where("lastSeenAt", "!=", null)
      .orderBy("lastSeenAt", "desc")
      .limit(200)
      .get()

    const now = Date.now()

    const users = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>
      const lastSeenAt = toIso(data.lastSeenAt)
      const isOnline = now - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS

      return {
        uid: doc.id,
        email: typeof data.email === "string" ? data.email : null,
        displayName: typeof data.displayName === "string" ? data.displayName : null,
        lastSeenAt,
        workspaceIds: Array.isArray(data.workspaceIds)
          ? (data.workspaceIds as unknown[]).filter((id): id is string => typeof id === "string")
          : [],
        isOnline,
      }
    })

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error("GET /api/admin/presence error:", error)
    return NextResponse.json({ error: "Unable to load presence data." }, { status: 500 })
  }
}
