import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = await request.json().catch(() => ({}))
    const intakeId = typeof body.intakeId === "string" ? body.intakeId : null

    if (!intakeId) {
      return NextResponse.json({ success: false, error: "Intake ID is required" }, { status: 400 })
    }

    // 1. Fetch intake bucket item details
    const intakeRef = db.collection("gitHubIntakeBucket").doc(intakeId)
    const intakeSnap = await intakeRef.get()
    if (!intakeSnap.exists) {
      return NextResponse.json({ success: false, error: "Intake item not found" }, { status: 404 })
    }

    const intakeData = intakeSnap.data() || {}
    const partnerName = intakeData.partnerName || "Intake Lead"
    const repoURL = intakeData.repoURL || ""

    // Slugify name for workspace id
    const workspaceId = partnerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `workspace-${Date.now()}`

    // 2. Create Client document in Firestore
    const clientRef = db.collection("clients").doc()
    const clientData = {
      id: clientRef.id,
      name: partnerName,
      activeProducts: ["nexus"],
      contactEmail: "intake@readyaimgo.biz",
      portalEmail: "intake@readyaimgo.biz",
      storyId: partnerName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "LEAD",
      workspaceId,
      retainerBalanceCents: 0,
      retainerBalance: 0,
      createdAt: new Date().toISOString(),
    }
    await clientRef.set(clientData)

    // 3. Create Workspace document in Firestore
    const workspaceRef = db.collection("workspaces").doc(workspaceId)
    const workspaceData = {
      id: workspaceId,
      name: `${partnerName} Workspace`,
      repoURL,
      showOnFrontend: false,
      vercelProductionUrl: "",
      vercelProjectId: "",
      githubSlug: repoURL.split("/").pop() || workspaceId,
      clientName: partnerName,
      clientId: clientRef.id,
      storyId: clientData.storyId,
      createdAt: new Date().toISOString(),
    }
    await workspaceRef.set(workspaceData)

    // 4. Mark intake item as promoted
    await intakeRef.update({ promoted: true })

    return NextResponse.json({
      success: true,
      clientId: clientRef.id,
      workspaceId,
      message: `Successfully promoted partner ${partnerName} to a client workspace.`,
    })
  } catch (error) {
    console.error("POST /api/admin/intake/repos/promote error:", error)
    return NextResponse.json({ success: false, error: "Failed to promote intake item" }, { status: 500 })
  }
}
