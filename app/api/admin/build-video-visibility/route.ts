import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { getWorkspaceStatusVideoCandidateClientIds } from "@/lib/portal-status-videos"

export const dynamic = "force-dynamic"

type VisibilityStatus = "visible" | "missing_statusVideo" | "missing_workspace" | "unmatched"

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function toIsoString(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value === "object") {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number }
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString()
    const seconds = timestamp.seconds ?? timestamp._seconds
    if (typeof seconds === "number") return new Date(seconds * 1000).toISOString()
  }
  return null
}

async function resolveClient(
  db: ReturnType<typeof getAdminDb>,
  marker: Record<string, unknown>
): Promise<{ id: string; slug: string | null; name: string } | null> {
  const markerClientId = readString(marker.clientId)
  const markerClientSlug = readString(marker.clientSlug)

  if (markerClientId) {
    const snap = await db.collection("clients").doc(markerClientId).get()
    if (snap.exists) {
      const data = snap.data() ?? {}
      return {
        id: snap.id,
        slug: readString(data.storyId) || markerClientSlug || snap.id,
        name: readString(data.name) || readString(data.displayName) || snap.id,
      }
    }
  }

  if (markerClientSlug) {
    const storySnap = await db.collection("clients").where("storyId", "==", markerClientSlug).limit(1).get()
    const clientDoc = storySnap.docs[0] ?? await db.collection("clients").doc(markerClientSlug).get()
    if (clientDoc.exists) {
      const data = clientDoc.data() ?? {}
      return {
        id: clientDoc.id,
        slug: readString(data.storyId) || markerClientSlug,
        name: readString(data.name) || readString(data.displayName) || clientDoc.id,
      }
    }
  }

  return null
}

function smsState(marker: Record<string, unknown>): string {
  const sent = readBoolean(marker.smsSent) ?? readBoolean(marker.sendSmsSucceeded)
  const skipped = readBoolean(marker.smsSkipped)
  const sendSms = readBoolean(marker.sendSms)
  const status = readString(marker.smsStatus)

  if (status) return status
  if (sent === true) return "sent"
  if (skipped === true || sendSms === false) return "skipped"
  if (sent === false) return "failed"
  return "unavailable"
}

function recommendation(status: VisibilityStatus): string | null {
  if (status === "missing_statusVideo") {
    return "Repair: recreate or relink the missing clients/{clientId}/statusVideos/{videoId} document from this processed marker before expecting portal visibility."
  }
  if (status === "missing_workspace") {
    return "Repair: link a workspace by setting workspaces/{workspaceId}.clientId to this client ID, or set the client's canonical workspaceId and create the matching workspace."
  }
  if (status === "unmatched") {
    return "Repair: add a clientId/clientSlug to the marker or re-run matching after confirming the Drive filename maps to a client slug."
  }
  return null
}

async function verifyPortalVisibility(request: NextRequest) {
  const db = getAdminDb()
  const workspaceId = readString(request.nextUrl.searchParams.get("workspaceId"))
  const clientId = readString(request.nextUrl.searchParams.get("clientId"))
  const videoId = readString(request.nextUrl.searchParams.get("videoId"))

  if (!workspaceId || !clientId || !videoId) {
    return NextResponse.json(
      { success: false, error: "workspaceId, clientId, and videoId are required." },
      { status: 400 }
    )
  }

  const candidates = await getWorkspaceStatusVideoCandidateClientIds(db, workspaceId)
  const candidateHasClient = candidates.candidateClientIds.includes(clientId)
  const statusVideoSnap = candidateHasClient
    ? await db.collection("clients").doc(clientId).collection("statusVideos").doc(videoId).get()
    : null
  const shouldAppear = Boolean(candidateHasClient && statusVideoSnap?.exists)

  return NextResponse.json({
    success: true,
    data: {
      workspaceId,
      clientId,
      videoId,
      candidateClientIds: candidates.candidateClientIds,
      workspaceExists: candidates.workspaceExists,
      workspaceClientId: candidates.workspaceClientId,
      statusVideoExists: Boolean(statusVideoSnap?.exists),
      shouldAppear,
      message: shouldAppear
        ? `Visible: ${videoId} should appear in workspace ${workspaceId} Updates.`
        : candidateHasClient
          ? `Not visible: workspace ${workspaceId} maps to ${clientId}, but the status video document is missing.`
          : `Not visible: workspace ${workspaceId} portal lookup checks ${candidates.candidateClientIds.join(", ") || "no client IDs"}, not ${clientId}.`,
    },
  })
}

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    if (request.nextUrl.searchParams.get("verify") === "portal") {
      return await verifyPortalVisibility(request)
    }

    const db = getAdminDb()
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10) || 50, 100)
    const markersSnap = await db
      .collection("processedVideos")
      .orderBy("processedAt", "desc")
      .limit(limit)
      .get()

    const rows = await Promise.all(
      markersSnap.docs.map(async (doc) => {
        const marker = serializeFirestoreDocument(doc.id, doc.data())
        const client = await resolveClient(db, marker)
        const videoId = readString(marker.videoId)
        const statusVideoSnap = client && videoId
          ? await db.collection("clients").doc(client.id).collection("statusVideos").doc(videoId).get()
          : null
        const statusVideo = statusVideoSnap?.exists
          ? serializeFirestoreDocument(statusVideoSnap.id, statusVideoSnap.data())
          : null
        const workspacesSnap = client
          ? await db.collection("workspaces").where("clientId", "==", client.id).limit(25).get()
          : null
        const linkedWorkspaceIds = workspacesSnap?.docs.map((workspaceDoc) => workspaceDoc.id) ?? []
        const status: VisibilityStatus = !client
          ? "unmatched"
          : !statusVideo
            ? "missing_statusVideo"
            : linkedWorkspaceIds.length === 0
              ? "missing_workspace"
              : "visible"

        return {
          markerId: doc.id,
          driveFileId: readString(marker.driveFileId) || doc.id.replace(/^drive_/, ""),
          originalName: readString(marker.originalName) || readString(marker.name) || "Unknown Drive file",
          processedAt: toIsoString(marker.processedAt),
          clientSlug: client?.slug ?? readString(marker.clientSlug),
          clientId: client?.id ?? readString(marker.clientId),
          clientName: client?.name ?? null,
          statusVideoId: videoId,
          statusVideoExists: Boolean(statusVideo),
          videoTitle: readString(statusVideo?.title) || readString(marker.title),
          storagePath: readString(marker.storagePath),
          linkedWorkspaceIds,
          workspaceMappingExists: linkedWorkspaceIds.length > 0,
          sms: smsState(marker),
          status,
          recommendation: recommendation(status),
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        rows,
        loadedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("GET /api/admin/build-video-visibility:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load build video visibility." },
      { status: 500 }
    )
  }
}

