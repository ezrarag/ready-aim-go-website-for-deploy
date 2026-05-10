import { NextRequest, NextResponse } from "next/server"
import { getAllClientDirectoryEntries, createClientDocument } from "@/lib/firestore"
import { getDefaultModules } from "@/lib/client-directory"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { provisionClientPortalAccess } from "@/lib/provision-client-portal"

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null
  const collection = "clients"

  try {
    const firebaseClients = await getAllClientDirectoryEntries()

    if (firebaseClients.length === 0) {
      return NextResponse.json({
        success: true,
        source: "firestore-empty",
        clients: [],
        meta: { projectId, collection },
      })
    }

    return NextResponse.json({
      success: true,
      source: "firestore",
      clients: firebaseClients,
      meta: { projectId, collection },
    })
  } catch (error) {
    console.error("Failed to fetch clients directory:", error)
    return NextResponse.json(
      {
        success: false,
        source: "firestore-error",
        clients: [],
        error: error instanceof Error ? error.message : String(error),
        meta: { projectId, collection },
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
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const storyId = typeof body.storyId === "string" ? body.storyId.trim() : ""
    const storyVideoUrl = typeof body.storyVideoUrl === "string" ? body.storyVideoUrl.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!name || !storyId || !storyVideoUrl) {
      return NextResponse.json(
        { success: false, error: "name, storyId, and storyVideoUrl are required" },
        { status: 400 }
      )
    }

    const modules = body.modules ?? getDefaultModules()

    // 1. Create the client document in the clients collection
    const id = await createClientDocument({
      name,
      storyId,
      storyVideoUrl,
      githubRepo: typeof body.githubRepo === "string" ? body.githubRepo.trim() : undefined,
      githubRepos: Array.isArray(body.githubRepos)
        ? body.githubRepos.filter((v: unknown): v is string => typeof v === "string")
        : undefined,
      deployHosts: Array.isArray(body.deployHosts)
        ? body.deployHosts.filter((v: unknown): v is string => typeof v === "string")
        : undefined,
      deployUrl: typeof body.deployUrl === "string" ? body.deployUrl.trim() : undefined,
      showOnFrontend: body.showOnFrontend !== false,
      brands: Array.isArray(body.brands) ? body.brands : [],
      status: body.status ?? "onboarding",
      modules,
    })

    // 2. Auto-provision portal access if email was provided
    let portalProvisioned = false
    let portalResult = null

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      try {
        portalResult = await provisionClientPortalAccess({
          clientId: id,
          clientName: name,
          email,
          clientSlug: storyId,
          deliverables: Array.isArray(body.deliverables) ? body.deliverables : [],
          addedBy: "auto-provision-on-create",
        })
        portalProvisioned = true
      } catch (portalError) {
        // Non-fatal — client is created, portal provisioning failed
        // Admin can manually provision from the client detail page
        console.error("[clients POST] Portal provisioning failed:", portalError)
      }
    }

    return NextResponse.json({
      success: true,
      id,
      portalProvisioned,
      portalResult,
      message: portalProvisioned
        ? `Client created and portal access granted to ${email}`
        : email
          ? `Client created — portal provisioning failed, use the Invite to Portal button on the client detail page`
          : `Client created — add email later to grant portal access`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create client",
      },
      { status: 500 }
    )
  }
}
