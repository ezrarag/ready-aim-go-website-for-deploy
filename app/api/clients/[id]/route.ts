import { type NextRequest, NextResponse } from "next/server"
import {
  getClientDirectoryEntryById,
  getLatestPublishedUpdate,
} from "@/lib/firestore"
import type { ModuleKey } from "@/lib/client-directory"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const clientId = params.id
    const { searchParams } = new URL(request.url)
    const latestUpdates = searchParams.get("latestUpdates") === "true"

    const client = await getClientDirectoryEntryById(clientId)
    if (!client) {
      return NextResponse.json({
        success: false,
        client: null,
        source: "firestore-empty",
      })
    }

    const out: { success: boolean; client: typeof client; source: string; latestUpdates?: Record<ModuleKey, Awaited<ReturnType<typeof getLatestPublishedUpdate>>> } = {
      success: true,
      client,
      source: "firestore",
    }

    if (latestUpdates) {
      const keys: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]
      const entries = await Promise.all(
        keys.map(async (type) => [type, await getLatestPublishedUpdate(clientId, type)] as const)
      )
      out.latestUpdates = Object.fromEntries(entries) as Record<ModuleKey, Awaited<ReturnType<typeof getLatestPublishedUpdate>>>
    }

    return NextResponse.json(out)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        source: "firestore-error",
        error: error instanceof Error ? error.message : "Failed to fetch client",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const clientId = params.id
    const db = (await import("@/lib/firestore")).getFirestoreDb()
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 503 }
      )
    }
    const body = await request.json()
    const ref = db.collection("clients").doc(clientId)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }
    const allowed = [
      "name", "storyId", "brands", "status", "lastActivity", "pulseSummary",
      "deployStatus", "deployUrl", "stripeStatus", "revenue", "meetings", "emails",
      "commits", "lastDeploy", "storyVideoUrl", "isNewStory", "modules",
      "websiteUrl", "appUrl", "appStoreUrl",
      "rdUrl", "housingUrl", "transportationUrl", "insuranceUrl",
    ] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true })
    }
    await ref.update(updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update client",
      },
      { status: 500 }
    )
  }
}
