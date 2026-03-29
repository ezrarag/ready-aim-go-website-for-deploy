import { NextRequest, NextResponse } from "next/server"
import { getAllClientDirectoryEntries, getFirestoreDb } from "@/lib/firestore"
import { buildClientUpdatesFromVercelProject, listVercelProjects, matchVercelProjectToClient } from "@/lib/vercel"

function isAuthorized(request: NextRequest): boolean {
  const syncSecret = process.env.VERCEL_SYNC_SECRET
  if (!syncSecret) return true

  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${syncSecret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  return querySecret === syncSecret
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Firebase not initialized" }, { status: 503 })
    }

    const [clients, projects] = await Promise.all([getAllClientDirectoryEntries(), listVercelProjects()])

    const results = await Promise.all(
      clients.map(async (client) => {
        const match = matchVercelProjectToClient(client, projects)
        if (!match) {
          return {
            clientId: client.id,
            clientName: client.name,
            synced: false,
            reason: "No matching Vercel project found",
          }
        }

        const updates = buildClientUpdatesFromVercelProject(client, match.project)
        await db.collection("clients").doc(client.id).update(updates)

        return {
          clientId: client.id,
          clientName: client.name,
          synced: true,
          projectId: match.project.id,
          projectName: match.project.name,
          reasons: match.reasons,
        }
      })
    )

    return NextResponse.json({
      success: true,
      syncedCount: results.filter((result) => result.synced).length,
      totalClients: clients.length,
      totalProjects: projects.length,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync clients from Vercel",
      },
      { status: 500 }
    )
  }
}
