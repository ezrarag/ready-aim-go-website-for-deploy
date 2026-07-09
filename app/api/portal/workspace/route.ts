import { type NextRequest, NextResponse } from "next/server"

import { resolvePortalIdentity } from "@/lib/portal-auth"
import { getFirestoreDb } from "@/lib/firestore"
import {
  getActiveProductKeys,
  getModuleKeysForProducts,
  normalizeClientSubscriptions,
  readAdminProductKeys,
  type AdminProductKey,
} from "@/lib/admin/products"
import { syncClientProductSelections } from "@/lib/admin/client-product-sync"
import { updateWorkspaceFrontEndSettings } from "@/lib/admin/workspace-frontend"

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

async function resolveWorkspaceForClient(db: FirebaseFirestore.Firestore, clientId: string) {
  const clientSnap = await db.collection("clients").doc(clientId).get()
  if (!clientSnap.exists) return { clientSnap: null, workspaceSnap: null }

  const clientData = (clientSnap.data() as Record<string, unknown>) || {}
  const directWorkspaceId = readString(clientData.workspaceId)
  if (directWorkspaceId) {
    const workspaceSnap = await db.collection("workspaces").doc(directWorkspaceId).get()
    if (workspaceSnap.exists) {
      return { clientSnap, workspaceSnap }
    }
  }

  const fallback = await db.collection("workspaces").where("clientId", "==", clientId).limit(1).get()
  return {
    clientSnap,
    workspaceSnap: fallback.empty ? null : fallback.docs[0],
  }
}

function serializeWorkspacePayload(
  workspaceSnap: FirebaseFirestore.DocumentSnapshot,
  clientData: Record<string, unknown>
) {
  const workspaceData = (workspaceSnap.data() as Record<string, unknown>) || {}
  return {
    id: workspaceSnap.id,
    name: readString(workspaceData.name) || workspaceSnap.id,
    clientId: readString(workspaceData.clientId),
    showOnFrontend: workspaceData.showOnFrontend === true,
    publicUrl: readString(workspaceData.publicUrl),
    previewImageUrl: readString(workspaceData.previewImageUrl),
    frontEndProducts: Array.isArray(workspaceData.frontEndProducts)
      ? workspaceData.frontEndProducts.filter((item): item is string => typeof item === "string")
      : [],
    frontEndTags: Array.isArray(workspaceData.frontEndTags)
      ? workspaceData.frontEndTags.filter((item): item is string => typeof item === "string")
      : [],
    activeProducts: getActiveProductKeys(normalizeClientSubscriptions(clientData)),
  }
}

export async function GET(request: NextRequest) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { clientSnap, workspaceSnap } = await resolveWorkspaceForClient(db, identity.activeClientId)
    if (!clientSnap?.exists) {
      return NextResponse.json({ success: false, error: "Client profile not found" }, { status: 404 })
    }
    if (!workspaceSnap?.exists) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
    }

    const clientData = (clientSnap.data() as Record<string, unknown>) || {}
    return NextResponse.json({
      success: true,
      data: serializeWorkspacePayload(workspaceSnap, clientData),
    })
  } catch (error) {
    console.error("GET /api/portal/workspace:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { clientSnap, workspaceSnap } = await resolveWorkspaceForClient(db, identity.activeClientId)
    if (!clientSnap?.exists) {
      return NextResponse.json({ success: false, error: "Client profile not found" }, { status: 404 })
    }
    if (!workspaceSnap?.exists) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = typeof body.name === "string" ? body.name.trim() : undefined
    const publicUrl = typeof body.publicUrl === "string" ? body.publicUrl.trim() : undefined
    const previewImageUrl =
      typeof body.previewImageUrl === "string" ? body.previewImageUrl.trim() : undefined
    const showOnFrontend = typeof body.showOnFrontend === "boolean" ? body.showOnFrontend : undefined
    const activeProducts = readAdminProductKeys(body.activeProducts)

    if (
      name === undefined &&
      publicUrl === undefined &&
      previewImageUrl === undefined &&
      showOnFrontend === undefined &&
      activeProducts === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "name, publicUrl, previewImageUrl, showOnFrontend, or activeProducts is required." },
        { status: 400 }
      )
    }

    let workspaceResult: Awaited<ReturnType<typeof updateWorkspaceFrontEndSettings>> | null = null
    const derivedFrontEndProducts =
      activeProducts !== undefined ? getModuleKeysForProducts(activeProducts as AdminProductKey[]) : undefined
    if (
      name !== undefined ||
      publicUrl !== undefined ||
      previewImageUrl !== undefined ||
      showOnFrontend !== undefined ||
      activeProducts !== undefined
    ) {
      workspaceResult = await updateWorkspaceFrontEndSettings(db, workspaceSnap.id, {
        name,
        showOnFrontend,
        publicUrl: publicUrl !== undefined ? publicUrl || null : undefined,
        previewImageUrl: previewImageUrl !== undefined ? previewImageUrl || null : undefined,
        frontEndProducts: derivedFrontEndProducts,
      })
    }

    if (activeProducts !== undefined) {
      await syncClientProductSelections(db, {
        clientId: identity.activeClientId,
        activeProducts: activeProducts as AdminProductKey[],
        workspaceId: workspaceSnap.id,
      })
    }

    const refreshedClient = (await clientSnap.ref.get()).data() as Record<string, unknown>
    const refreshedWorkspace = await workspaceSnap.ref.get()

    return NextResponse.json({
      success: true,
      data: serializeWorkspacePayload(refreshedWorkspace, refreshedClient || {}),
      workspace: workspaceResult,
    })
  } catch (error) {
    console.error("PATCH /api/portal/workspace:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
