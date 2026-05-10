import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { resolvePortalIdentity, isClientAllowed } from "@/lib/portal-auth"

type Params = { params: Promise<{ projectId: string }> }

// GET /api/portal/projects/[projectId]/tasks
export async function GET(request: NextRequest, context: Params) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    // Verify the project belongs to this client first
    const projectDoc = await db.collection("projects").doc(projectId).get()
    if (!projectDoc.exists) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }
    const projectData = projectDoc.data() as Record<string, unknown>
    if (!isClientAllowed(identity, projectData.clientId as string)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100)

    let query: FirebaseFirestore.Query = db
      .collection("projectTasks")
      .where("projectId", "==", projectId)
    if (status) query = query.where("status", "==", status)

    const snap = await query.limit(limit).get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    })
  } catch (err) {
    console.error("GET /api/portal/projects/[projectId]/tasks:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
