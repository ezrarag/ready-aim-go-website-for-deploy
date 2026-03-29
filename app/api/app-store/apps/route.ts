import { NextRequest, NextResponse } from "next/server"
import { createClientDocument, getAllClientDirectoryEntries, getClientDirectoryEntryById, getFirestoreDb } from "@/lib/firestore"
import {
  buildClientUpdatesFromAppStoreApp,
  findAppStoreAppsWithLinkedClients,
  listAppStoreApps,
  slugifyAppStoreName,
} from "@/lib/app-store"
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

export async function GET(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [clients, apps] = await Promise.all([getAllClientDirectoryEntries(), listAppStoreApps()])
    const discovered = findAppStoreAppsWithLinkedClients(clients, apps)

    return NextResponse.json({
      success: true,
      apps: discovered,
      unlinkedApps: discovered.filter((app) => !app.linkedClientId),
      totalApps: discovered.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch App Store apps",
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
    const appId = typeof body.appId === "string" ? body.appId.trim() : ""
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : ""
    const mode = body.mode === "link" ? "link" : "create"

    if (!appId) {
      return NextResponse.json({ success: false, error: "appId is required" }, { status: 400 })
    }

    const [clients, apps] = await Promise.all([getAllClientDirectoryEntries(), listAppStoreApps()])
    const app = apps.find((entry) => entry.id === appId)
    if (!app) {
      return NextResponse.json({ success: false, error: "App Store app not found" }, { status: 404 })
    }

    if (mode === "create") {
      const storyId = ensureUniqueStoryId(
        slugifyAppStoreName(app.name),
        new Set(clients.map((client) => client.storyId))
      )

      const newClientId = await createClientDocument({
        name: app.name,
        storyId,
        showOnFrontend: false,
        status: "onboarding",
        appStoreConnectAppId: app.id,
        appStoreConnectName: app.name,
        appStoreConnectBundleId: app.bundleId,
        appStoreConnectPlatform: app.platform,
        appStoreConnectSku: app.sku,
        appStoreConnectVersionString: app.latestVersionString,
        appStoreConnectBuildNumber: app.latestBuildNumber,
        appStoreConnectBuildState: app.buildState,
        appStoreConnectBetaGroups: app.betaGroups,
        appStoreConnectUpdatedAt: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        mode,
        clientId: newClientId,
        app,
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

    const updates = buildClientUpdatesFromAppStoreApp(client, app)
    await db.collection("clients").doc(client.id).update(updates)

    return NextResponse.json({
      success: true,
      mode,
      clientId: client.id,
      app,
      updates,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to attach App Store app",
      },
      { status: 500 }
    )
  }
}
