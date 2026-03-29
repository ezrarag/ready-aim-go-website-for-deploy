import { NextRequest, NextResponse } from "next/server"
import { createClientDocument, getAllClientDirectoryEntries, getClientDirectoryEntryById, getFirestoreDb } from "@/lib/firestore"
import { buildClientUpdatesFromVercelProject, findUnlinkedVercelProjects, listVercelProjects, slugifyProjectName } from "@/lib/vercel"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

function ensureUniqueStoryId(base: string, existingStoryIds: Set<string>): string {
  let next = base || "client"
  let counter = 2
  while (existingStoryIds.has(next)) {
    next = `${base || "client"}-${counter}`
    counter += 1
  }
  return next
}

export async function GET() {
  try {
    const [clients, projects] = await Promise.all([getAllClientDirectoryEntries(), listVercelProjects()])
    const discovered = findUnlinkedVercelProjects(clients, projects)

    return NextResponse.json({
      success: true,
      projects: discovered,
      unlinkedProjects: discovered.filter((project) => !project.linkedClientId),
      totalProjects: discovered.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Vercel projects",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const projectId = typeof body.projectId === "string" ? body.projectId : ""
    const clientId = typeof body.clientId === "string" ? body.clientId : ""
    const mode = body.mode === "link" ? "link" : "create"

    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId is required" }, { status: 400 })
    }

    const [clients, projects] = await Promise.all([getAllClientDirectoryEntries(), listVercelProjects()])
    const project = projects.find((entry) => entry.id === projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: "Vercel project not found" }, { status: 404 })
    }

    if (mode === "create") {
      const storyId = ensureUniqueStoryId(
        slugifyProjectName(project.name),
        new Set(clients.map((client) => client.storyId))
      )
      const newClientId = await createClientDocument({
        name: project.name,
        storyId,
        storyVideoUrl: "",
        showOnFrontend: false,
        status: "onboarding",
        lastActivity: project.readyAt ?? project.updatedAt ?? "Recently updated",
        deployStatus: project.productionUrl ? "live" : "building",
        deployUrl: project.productionUrl,
        deployHosts: project.domains,
        websiteUrl: project.customDomains[0] ? `https://${project.customDomains[0]}` : project.productionUrl,
        githubRepo: project.repoSlug,
        githubRepos: project.repoSlug ? [project.repoSlug] : [],
        vercelProjectId: project.id,
        vercelProjectName: project.name,
        vercelProjectDomains: project.domains,
        vercelProjectUpdatedAt: project.updatedAt,
      })

      const db = getFirestoreDb()
      if (db) {
        await db.collection("clients").doc(newClientId).update({
          vercelProjectId: project.id,
          vercelProjectName: project.name,
          vercelProjectDomains: project.domains,
          vercelProjectUpdatedAt: project.updatedAt ?? null,
          updatedAt: new Date().toISOString(),
        })
      }

      return NextResponse.json({
        success: true,
        mode,
        clientId: newClientId,
        project,
      })
    }

    if (!clientId) {
      return NextResponse.json({ success: false, error: "clientId is required for link mode" }, { status: 400 })
    }

    const client = await getClientDirectoryEntryById(clientId)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Firebase not initialized" }, { status: 503 })
    }

    const updates = buildClientUpdatesFromVercelProject(client, project)
    await db.collection("clients").doc(client.id).update(updates)

    return NextResponse.json({
      success: true,
      mode,
      clientId: client.id,
      project,
      updates,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to attach Vercel project",
      },
      { status: 500 }
    )
  }
}
