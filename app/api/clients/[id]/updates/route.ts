import { type NextRequest, NextResponse } from "next/server"
import { getClientUpdates, createClientUpdate } from "@/lib/firestore"
import type { ModuleKey, UpdateStatus } from "@/lib/client-directory"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const clientId = params.id
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") as ModuleKey | null
    const status = searchParams.get("status") as UpdateStatus | null
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 50)

    const updates = await getClientUpdates(clientId, {
      ...(type && MODULE_KEYS.includes(type) && { type }),
      ...(status && (status === "draft" || status === "published") && { status }),
      limit,
    })

    return NextResponse.json({
      success: true,
      updates,
      source: "firestore",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        updates: [],
        error: error instanceof Error ? error.message : "Failed to fetch updates",
      },
      { status: 500 }
    )
  }
}

const MODULE_KEYS: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const clientId = params.id
    const body = await request.json()

    const type = body.type as string
    if (!MODULE_KEYS.includes(type as ModuleKey)) {
      return NextResponse.json(
        { success: false, error: "type must be one of: web, app, rd, housing, transportation, insurance" },
        { status: 400 }
      )
    }
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 })
    }

    const updateId = await createClientUpdate(clientId, {
      type: type as ModuleKey,
      title,
      summary: typeof body.summary === "string" ? body.summary : undefined,
      details: typeof body.details === "string" ? body.details : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
      status: body.status === "published" ? "published" : "draft",
      links: body.links && typeof body.links === "object" ? body.links : undefined,
      video: body.video && typeof body.video === "object" ? body.video : undefined,
      versionLabel: typeof body.versionLabel === "string" ? body.versionLabel : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : undefined,
      createdByUid: typeof body.createdByUid === "string" ? body.createdByUid : undefined,
    })

    return NextResponse.json({ success: true, id: updateId })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create update",
      },
      { status: 500 }
    )
  }
}
