import { type NextRequest, NextResponse } from "next/server"

import type { ModuleKey } from "@/lib/client-directory"
import { getFirestoreDb } from "@/lib/firestore"
import { relinkWorkspaceClient, updateWorkspaceFrontEndSettings } from "@/lib/admin/workspace-frontend"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string }> }

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function readModuleKeys(value: unknown): ModuleKey[] | undefined {
  const keys: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is ModuleKey => typeof item === "string" && keys.includes(item as ModuleKey))
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const id = decodeURIComponent(workspaceId)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("workspaces").doc(id).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
    }

    const data = doc.data() as Record<string, unknown>
    return NextResponse.json({
      success: true,
      workspace: {
        id: doc.id,
        clientId: readString(data.clientId),
        showOnFrontend: data.showOnFrontend === true,
        publicUrl: readString(data.publicUrl),
        previewImageUrl: readString(data.previewImageUrl),
        frontEndProducts: readModuleKeys(data.frontEndProducts) || [],
        frontEndTags: readStringArray(data.frontEndTags) || [],
      },
    })
  } catch (error) {
    console.error("GET /api/admin/workspaces/[workspaceId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { workspaceId } = await context.params
  const id = decodeURIComponent(workspaceId)
  const db = getFirestoreDb()
  if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

  const ref = db.collection("workspaces").doc(id)
  const snap = await ref.get()
  if (!snap.exists) {
    return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const showOnFrontend = readBoolean(body.showOnFrontend)
  const publicUrlRaw = body.publicUrl
  const publicUrl = typeof publicUrlRaw === "string" ? publicUrlRaw.trim() : undefined
  const previewImageUrlRaw = body.previewImageUrl
  const previewImageUrl = typeof previewImageUrlRaw === "string" ? previewImageUrlRaw.trim() : undefined
  const frontEndProducts = readModuleKeys(body.frontEndProducts)
  const frontEndTags = readStringArray(body.frontEndTags)
  const clientId = body.clientId === null ? null : readString(body.clientId)
  const setCanonicalForClient = body.setCanonicalForClient === true

  if (
    showOnFrontend === undefined &&
    publicUrl === undefined &&
    previewImageUrl === undefined &&
    frontEndProducts === undefined &&
    frontEndTags === undefined &&
    !("clientId" in body)
  ) {
    return NextResponse.json(
      { success: false, error: "showOnFrontend, publicUrl, previewImageUrl, frontEndProducts, frontEndTags, or clientId is required." },
      { status: 400 }
    )
  }

  let relinkResult: Awaited<ReturnType<typeof relinkWorkspaceClient>> | null = null
  if ("clientId" in body) {
    relinkResult = await relinkWorkspaceClient(db, id, clientId, setCanonicalForClient)
  }

  const result = await updateWorkspaceFrontEndSettings(db, id, {
    showOnFrontend,
    publicUrl: publicUrl !== undefined ? publicUrl || null : undefined,
    previewImageUrl: previewImageUrl !== undefined ? previewImageUrl || null : undefined,
    frontEndProducts,
    frontEndTags,
  })

  return NextResponse.json({
    success: true,
    workspace: result,
    clientMirrored: result.clientMirrored,
    relink: relinkResult,
  })
}
