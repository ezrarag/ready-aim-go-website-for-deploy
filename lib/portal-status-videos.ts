import type { Firestore } from "firebase-admin/firestore"

import { serializeFirestoreDocument } from "@/lib/firestore-json"

export type PortalStatusVideo = {
  id: string
  clientId: string
  title: string
  createdAt: string | null
  videoUrl: string | null
  category: string | null
  aiSummary: string[]
  rawTranscript: string | null
}

export type WorkspaceStatusVideoCandidates = {
  workspaceId: string
  workspaceExists: boolean
  workspaceClientId: string | null
  candidateClientIds: string[]
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
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

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))))
}

function normalizeStatusVideo(clientId: string, id: string, input: unknown): PortalStatusVideo {
  const data = serializeFirestoreDocument(id, input && typeof input === "object" ? input as Record<string, unknown> : {})

  return {
    id,
    clientId,
    title: readString(data.title) || "Untitled build update",
    createdAt: toIsoString(data.createdAt),
    videoUrl: readString(data.videoUrl),
    category: readString(data.category),
    aiSummary: readStringArray(data.aiSummary),
    rawTranscript: readString(data.rawTranscript),
  }
}

export async function getWorkspaceStatusVideoCandidateClientIds(
  db: Firestore,
  workspaceId: string
): Promise<WorkspaceStatusVideoCandidates> {
  const normalizedWorkspaceId = workspaceId.trim()
  const workspaceSnap = await db.collection("workspaces").doc(normalizedWorkspaceId).get()
  const workspaceData = workspaceSnap.exists ? workspaceSnap.data() as Record<string, unknown> : {}
  const workspaceClientId = readString(workspaceData.clientId)

  const clientsByWorkspaceSnap = await db
    .collection("clients")
    .where("workspaceId", "==", normalizedWorkspaceId)
    .limit(25)
    .get()
    .catch(() => null)

  const candidateClientIds = unique([
    workspaceClientId,
    normalizedWorkspaceId,
    ...(clientsByWorkspaceSnap?.docs.map((doc) => doc.id) ?? []),
  ])

  return {
    workspaceId: normalizedWorkspaceId,
    workspaceExists: workspaceSnap.exists,
    workspaceClientId,
    candidateClientIds,
  }
}

export async function listWorkspaceStatusVideos(
  db: Firestore,
  workspaceId: string,
  limit = 30
): Promise<{ candidates: WorkspaceStatusVideoCandidates; videos: PortalStatusVideo[] }> {
  const candidates = await getWorkspaceStatusVideoCandidateClientIds(db, workspaceId)
  const videos: PortalStatusVideo[] = []

  for (const clientId of candidates.candidateClientIds) {
    const snapshot = await db
      .collection("clients")
      .doc(clientId)
      .collection("statusVideos")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()
      .catch(() => null)

    for (const doc of snapshot?.docs ?? []) {
      videos.push(normalizeStatusVideo(clientId, doc.id, doc.data()))
    }
  }

  const seen = new Set<string>()
  const deduped = videos
    .filter((video) => {
      const key = `${video.clientId}:${video.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, limit)

  return { candidates, videos: deduped }
}

