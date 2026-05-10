import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { resolvePortalIdentity, isClientAllowed } from "@/lib/portal-auth"

type Params = { params: Promise<{ projectId: string }> }

// GET /api/portal/projects/[projectId] — fetch a single project, scoped to the client
export async function GET(request: NextRequest, context: Params) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("projects").doc(projectId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const data = doc.data() as Record<string, unknown>
    if (!isClientAllowed(identity, data.clientId as string)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: { id: doc.id, ...data } })
  } catch (err) {
    console.error("GET /api/portal/projects/[projectId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
