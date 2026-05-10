import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { resolvePortalIdentity, isClientAllowed } from "@/lib/portal-auth"

type Params = { params: Promise<{ projectId: string }> }

// POST /api/portal/projects/[projectId]/feedback
// Writes to projectFeedback collection
export async function POST(request: NextRequest, context: Params) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    // Verify the project belongs to this client
    const projectDoc = await db.collection("projects").doc(projectId).get()
    if (!projectDoc.exists) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }
    const projectData = projectDoc.data() as Record<string, unknown>
    if (!isClientAllowed(identity, projectData.clientId as string)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const message = typeof body.message === "string" ? body.message.trim() : ""
    if (!message) {
      return NextResponse.json({ success: false, error: "message is required" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const payload = {
      projectId,
      clientId: identity.activeClientId,
      authorUid: identity.uid,
      message,
      category: typeof body.category === "string" ? body.category : "general",
      rating: typeof body.rating === "number" ? Math.min(5, Math.max(1, body.rating)) : null,
      createdAt: now,
    }

    const ref = await db.collection("projectFeedback").add(payload)

    return NextResponse.json({ success: true, data: { id: ref.id, ...payload } }, { status: 201 })
  } catch (err) {
    console.error("POST /api/portal/projects/[projectId]/feedback:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
