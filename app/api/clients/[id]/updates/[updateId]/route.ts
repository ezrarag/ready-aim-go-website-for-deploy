import { type NextRequest, NextResponse } from "next/server"
import {
  getClientUpdateById,
  updateClientUpdate,
} from "@/lib/firestore"
import type { ModuleKey, UpdateStatus } from "@/lib/client-directory"

const MODULE_KEYS: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; updateId: string }> }
) {
  try {
    const params = await context.params
    const clientId = params.id
    const updateId = params.updateId

    const update = await getClientUpdateById(clientId, updateId)
    if (!update) {
      return NextResponse.json(
        { success: false, update: null, error: "Update not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      update,
      source: "firestore",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        update: null,
        error: error instanceof Error ? error.message : "Failed to fetch update",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; updateId: string }> }
) {
  try {
    const params = await context.params
    const clientId = params.id
    const updateId = params.updateId
    const body = await request.json()

    const existing = await getClientUpdateById(clientId, updateId)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Update not found" },
        { status: 404 }
      )
    }

    const updates: Parameters<typeof updateClientUpdate>[2] = {}
    if (body.type !== undefined && MODULE_KEYS.includes(body.type as ModuleKey)) {
      updates.type = body.type as ModuleKey
    }
    if (typeof body.title === "string") updates.title = body.title.trim()
    if (body.summary !== undefined) updates.summary = typeof body.summary === "string" ? body.summary : undefined
    if (body.details !== undefined) updates.details = typeof body.details === "string" ? body.details : undefined
    if (body.status === "draft" || body.status === "published") {
      updates.status = body.status as UpdateStatus
    }
    if (body.links !== undefined) updates.links = body.links && typeof body.links === "object" ? body.links : undefined
    if (body.video !== undefined) updates.video = body.video && typeof body.video === "object" ? body.video : undefined
    if (body.versionLabel !== undefined) updates.versionLabel = typeof body.versionLabel === "string" ? body.versionLabel : undefined
    if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : undefined

    await updateClientUpdate(clientId, updateId, updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update update",
      },
      { status: 500 }
    )
  }
}
