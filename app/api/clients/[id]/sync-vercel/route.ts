import { NextRequest, NextResponse } from "next/server"
import { getClientDirectoryEntryById, getFirestoreDb } from "@/lib/firestore"
import { buildClientUpdatesFromVercelProject, listVercelProjects, matchVercelProjectToClient } from "@/lib/vercel"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const client = await getClientDirectoryEntryById(id)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Firebase not initialized" }, { status: 503 })
    }

    const projects = await listVercelProjects()
    const match = matchVercelProjectToClient(client, projects)

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: "No matching Vercel project found for this client",
          projectsChecked: projects.length,
        },
        { status: 404 }
      )
    }

    const updates = buildClientUpdatesFromVercelProject(client, match.project)
    await db.collection("clients").doc(client.id).update(updates)

    return NextResponse.json({
      success: true,
      clientId: client.id,
      matchedProject: match.project,
      reasons: match.reasons,
      updates,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync client from Vercel",
      },
      { status: 500 }
    )
  }
}
