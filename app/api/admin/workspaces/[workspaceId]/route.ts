import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { updateWorkspaceFrontEndSettings } from "@/lib/admin/workspace-frontend"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string }> }

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

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
    },
  })
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

  if (showOnFrontend === undefined && publicUrl === undefined) {
    return NextResponse.json(
      { success: false, error: "showOnFrontend or publicUrl is required." },
      { status: 400 }
    )
  }

  const result = await updateWorkspaceFrontEndSettings(db, id, {
    showOnFrontend,
    publicUrl: publicUrl !== undefined ? publicUrl || null : undefined,
  })

  return NextResponse.json({
    success: true,
    workspace: result,
    clientMirrored: result.clientMirrored,
  })
}
