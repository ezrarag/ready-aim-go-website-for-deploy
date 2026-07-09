import type { Firestore } from "firebase-admin/firestore"

import { getClientUpdates } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { listWorkspaceStatusVideos, type PortalStatusVideo } from "@/lib/portal-status-videos"
import {
  formatWalletDate,
  normalizeClientRetainer,
  normalizeWalletAllocation,
  normalizeWalletContribution,
  normalizeWalletPool,
} from "@/lib/wallet-pools"

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
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

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export type WorkspaceContractSummary = {
  id: string
  title: string
  status: string
  type: string | null
  updatedAt: string | null
  fileUrls: string[]
  storagePath: string | null
}

export type WorkspaceMemberSummary = {
  id: string
  email: string | null
  displayName: string | null
  role: string | null
  status: string | null
  source: string | null
  updatedAt: string | null
}

export type WorkspaceInviteSummary = {
  id: string
  email: string | null
  role: string | null
  invitedByUid: string | null
  invitedAt: string | null
}

export type WorkspaceEmailSummary = {
  id: string
  subject: string
  from: string | null
  to: string | null
  date: string | null
  snippet: string | null
  threadUrl: string | null
}

export type WorkspaceMessageSummary = {
  id: string
  title: string | null
  content: string
  projectId: string | null
  clientId: string | null
  authorKind: string | null
  authorLabel: string | null
  createdAt: string | null
}

export type WorkspaceEventSummary = {
  id: string
  title: string
  start: string | null
  end: string | null
  attendees: string[]
  status: string | null
  meetLink: string | null
}

export type WorkspaceFileReference = {
  id: string
  label: string
  url: string
  source: "contract" | "update-video" | "workspace-file"
  projectId?: string | null
  scope?: string | null
  updatedAt: string | null
}

export type WorkspaceRetainerSummary = {
  exists: boolean
  amountTotal: number | null
  currency: string | null
  source: string | null
  poolId: string | null
  active: boolean
  poolName: string | null
  totalReceived: number
  totalAllocated: number
  contributionCount: number
  allocationCount: number
  latestContributionAt: string | null
}

export type AdminWorkspaceDetail = {
  workspace: {
    id: string
    name: string
    clientId: string | null
    clientEmail: string | null
    publicUrl: string | null
    suggestedPublicUrl: string | null
    showOnFrontend: boolean
    frontEndTags: string[]
    frontEndProducts: string[]
    repoCount: number
    vercelCount: number
    memberCount: number
    updatedAt: string | null
    hosting: Record<string, unknown>
  }
  client: {
    id: string
    name: string
    storyId: string | null
    contactEmail: string | null
    portalEmail: string | null
    deployUrl: string | null
    websiteUrl: string | null
    githubRepos: string[]
    updatedAt: string | null
  } | null
  contracts: WorkspaceContractSummary[]
  updates: Awaited<ReturnType<typeof getClientUpdates>>
  statusVideos: PortalStatusVideo[]
  members: WorkspaceMemberSummary[]
  pendingInvites: WorkspaceInviteSummary[]
  emails: WorkspaceEmailSummary[]
  messages: WorkspaceMessageSummary[]
  events: WorkspaceEventSummary[]
  fileReferences: WorkspaceFileReference[]
  retainer: WorkspaceRetainerSummary
}

function normalizeContract(id: string, input: Record<string, unknown>): WorkspaceContractSummary {
  const serialized = serializeFirestoreDocument(id, input)
  const attachments = Array.isArray(serialized.attachments)
    ? serialized.attachments.flatMap((item) => {
        if (typeof item === "string") return [item]
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>
          return [
            readString(record.url),
            readString(record.publicUrl),
            readString(record.fileUrl),
            readString(record.downloadUrl),
          ].filter((value): value is string => Boolean(value))
        }
        return []
      })
    : []

  const fileUrls = uniqueById(
    [
      readString(serialized.documentUrl),
      readString(serialized.fileUrl),
      readString(serialized.attachmentUrl),
      ...attachments,
    ]
      .filter((value): value is string => Boolean(value))
      .map((url) => ({ id: url, url }))
  ).map((entry) => entry.url)

  return {
    id,
    title:
      readString(serialized.title) ||
      readString(serialized.name) ||
      readString(serialized.documentName) ||
      readString(serialized.scopeTitle) ||
      id,
    status: readString(serialized.status) || "draft",
    type:
      readString(serialized.type) ||
      readString(serialized.contractType) ||
      readString(serialized.kind),
    updatedAt: toIsoString(serialized.updatedAt) || toIsoString(serialized.createdAt),
    fileUrls,
    storagePath: readString(serialized.storagePath),
  }
}

function normalizeMember(id: string, input: Record<string, unknown>): WorkspaceMemberSummary {
  const serialized = serializeFirestoreDocument(id, input)
  return {
    id,
    email: readString(serialized.email),
    displayName: readString(serialized.displayName),
    role: readString(serialized.role),
    status: readString(serialized.status),
    source: readString(serialized.source),
    updatedAt: toIsoString(serialized.updatedAt) || toIsoString(serialized.addedAt),
  }
}

function normalizeInvite(id: string, input: Record<string, unknown>): WorkspaceInviteSummary {
  const serialized = serializeFirestoreDocument(id, input)
  return {
    id,
    email: readString(serialized.email),
    role: readString(serialized.role),
    invitedByUid: readString(serialized.invitedByUid),
    invitedAt: toIsoString(serialized.invitedAt),
  }
}

function normalizeEmail(id: string, input: Record<string, unknown>): WorkspaceEmailSummary {
  const serialized = serializeFirestoreDocument(id, input)
  return {
    id,
    subject: readString(serialized.subject) || "(No subject)",
    from: readString(serialized.from),
    to: readString(serialized.to),
    date: toIsoString(serialized.date) || readString(serialized.date),
    snippet: readString(serialized.snippet),
    threadUrl: readString(serialized.threadUrl),
  }
}

function normalizeMessage(id: string, input: Record<string, unknown>): WorkspaceMessageSummary {
  const serialized = serializeFirestoreDocument(id, input)
  return {
    id,
    title: readString(serialized.title),
    content: readString(serialized.content) || "",
    projectId: readString(serialized.projectId),
    clientId: readString(serialized.clientId),
    authorKind: readString(serialized.authorKind),
    authorLabel: readString(serialized.authorLabel),
    createdAt: toIsoString(serialized.createdAt),
  }
}

function normalizeEvent(id: string, input: Record<string, unknown>): WorkspaceEventSummary {
  const serialized = serializeFirestoreDocument(id, input)
  return {
    id,
    title: readString(serialized.title) || "(No title)",
    start: toIsoString(serialized.start) || readString(serialized.start),
    end: toIsoString(serialized.end) || readString(serialized.end),
    attendees: readStringArray(serialized.attendees),
    status: readString(serialized.status),
    meetLink: readString(serialized.meetLink),
  }
}

export async function loadAdminWorkspaceDetail(
  db: Firestore,
  workspaceId: string
): Promise<AdminWorkspaceDetail | null> {
  const workspaceSnap = await db.collection("workspaces").doc(workspaceId).get()
  if (!workspaceSnap.exists) return null

  const workspaceData = workspaceSnap.data() as Record<string, unknown>
  const workspaceClientId = readString(workspaceData.clientId)

  const directClientSnap = workspaceClientId
    ? await db.collection("clients").doc(workspaceClientId).get()
    : null
  const fallbackClientSnap =
    directClientSnap?.exists
      ? null
      : await db.collection("clients").where("workspaceId", "==", workspaceId).limit(1).get()

  const clientSnap = directClientSnap?.exists
    ? directClientSnap
    : fallbackClientSnap?.docs[0] ?? null
  const clientId = clientSnap?.id ?? workspaceClientId ?? null
  const clientData = clientSnap?.exists ? (clientSnap.data() as Record<string, unknown>) : {}

  const [contractsByWorkspace, contractsByClient, membersSnap, invitesSnap, emailsSnap, messagesSnap, workspaceFilesSnap, eventsSnap, statusVideoData] =
    await Promise.all([
      db.collection("contracts").where("workspaceId", "==", workspaceId).limit(50).get().catch(() => null),
      clientId
        ? db.collection("contracts").where("clientId", "==", clientId).limit(50).get().catch(() => null)
        : Promise.resolve(null),
      db.collection("workspaces").doc(workspaceId).collection("members").limit(100).get().catch(() => null),
      db.collection("workspaces").doc(workspaceId).collection("pendingInvites").limit(100).get().catch(() => null),
      clientId
        ? db.collection("clientComms").doc(clientId).collection("emails").limit(20).get().catch(() => null)
        : Promise.resolve(null),
      db.collection("workspaces").doc(workspaceId).collection("messages").limit(40).get().catch(() => null),
      db.collection("workspaces").doc(workspaceId).collection("files").limit(40).get().catch(() => null),
      clientId
        ? db.collection("clientComms").doc(clientId).collection("events").limit(20).get().catch(() => null)
        : Promise.resolve(null),
      listWorkspaceStatusVideos(db, workspaceId, 12).catch(() => ({ candidates: null, videos: [] as PortalStatusVideo[] })),
    ])

  const contracts = uniqueById(
    [
      ...(contractsByWorkspace?.docs ?? []),
      ...(contractsByClient?.docs ?? []),
    ].map((doc) => normalizeContract(doc.id, doc.data() as Record<string, unknown>))
  ).sort((left, right) => {
    const leftTime = new Date(left.updatedAt ?? 0).getTime()
    const rightTime = new Date(right.updatedAt ?? 0).getTime()
    return rightTime - leftTime
  })

  const updates = clientId
    ? (await getClientUpdates(clientId, { limit: 24 })).filter((update) => !update.workspaceId || update.workspaceId === workspaceId)
    : []
  const members = (membersSnap?.docs ?? []).map((doc) => normalizeMember(doc.id, doc.data() as Record<string, unknown>))
  const pendingInvites = (invitesSnap?.docs ?? []).map((doc) => normalizeInvite(doc.id, doc.data() as Record<string, unknown>))
  const emails = (emailsSnap?.docs ?? [])
    .map((doc) => normalizeEmail(doc.id, doc.data() as Record<string, unknown>))
    .sort((left, right) => new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime())
  const messages = (messagesSnap?.docs ?? [])
    .map((doc) => normalizeMessage(doc.id, doc.data() as Record<string, unknown>))
    .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
  const events = (eventsSnap?.docs ?? [])
    .map((doc) => normalizeEvent(doc.id, doc.data() as Record<string, unknown>))
    .sort((left, right) => new Date(right.start ?? 0).getTime() - new Date(left.start ?? 0).getTime())

  const fileReferences = uniqueById([
    ...contracts.flatMap((contract) =>
      contract.fileUrls.map((url) => ({
        id: `contract:${contract.id}:${url}`,
        label: contract.title,
        url,
        source: "contract" as const,
        projectId: null,
        scope: "contract",
        updatedAt: contract.updatedAt,
      }))
    ),
    ...updates
      .filter((update) => update.video?.publicUrl)
      .map((update) => ({
        id: `update-video:${update.id}`,
        label: update.title || "Update video",
        url: update.video?.publicUrl || "",
        source: "update-video" as const,
        projectId: null,
        scope: update.workspaceId ? "workspace-update" : "client-update",
        updatedAt: update.createdAt,
      })),
    ...(workspaceFilesSnap?.docs ?? []).map((doc) => {
      const serialized = serializeFirestoreDocument(doc.id, doc.data() as Record<string, unknown>)
      return {
        id: `workspace-file:${doc.id}`,
        label: readString(serialized.title) || readString(serialized.filename) || doc.id,
        url: readString(serialized.url) || "",
        source: "workspace-file" as const,
        projectId: readString(serialized.projectId),
        scope: readString(serialized.scope),
        updatedAt: toIsoString(serialized.updatedAt) || toIsoString(serialized.createdAt),
      }
    }).filter((entry) => Boolean(entry.url)),
  ])

  const normalizedRetainer = normalizeClientRetainer(clientData.retainer)
  let retainer: WorkspaceRetainerSummary = {
    exists: Boolean(normalizedRetainer),
    amountTotal: normalizedRetainer?.amountTotal ?? null,
    currency: normalizedRetainer?.currency ?? null,
    source: normalizedRetainer?.source ?? null,
    poolId: normalizedRetainer?.poolId ?? null,
    active: normalizedRetainer?.active ?? false,
    poolName: null,
    totalReceived: 0,
    totalAllocated: 0,
    contributionCount: 0,
    allocationCount: 0,
    latestContributionAt: null,
  }

  if (normalizedRetainer?.poolId) {
    const poolRef = db.collection("walletPools").doc(normalizedRetainer.poolId)
    const [poolSnap, contributionSnap, allocationSnap] = await Promise.all([
      poolRef.get().catch(() => null),
      poolRef.collection("contributions")
        .where("clientId", "==", clientId ?? "__missing__")
        .limit(100)
        .get()
        .catch(() => null),
      poolRef.collection("allocations").limit(100).get().catch(() => null),
    ])

    const poolData = poolSnap?.exists ? normalizeWalletPool(poolSnap.id, poolSnap.data() as Record<string, unknown>) : null
    const contributions = (contributionSnap?.docs ?? []).map((doc) =>
      normalizeWalletContribution(doc.id, doc.data() as Record<string, unknown>)
    )
    const allocations = (allocationSnap?.docs ?? []).map((doc) =>
      normalizeWalletAllocation(doc.id, doc.data() as Record<string, unknown>)
    )

    retainer = {
      ...retainer,
      poolName: poolData?.name ?? normalizedRetainer.poolId,
      totalReceived: contributions.reduce((sum, item) => sum + item.amount, 0),
      totalAllocated: allocations.reduce((sum, item) => sum + item.amount, 0),
      contributionCount: contributions.length,
      allocationCount: allocations.length,
      latestContributionAt:
        contributions
          .map((item) => formatWalletDate(item.receivedAt))
          .filter((value): value is string => Boolean(value))
          .sort()
          .reverse()[0] ?? null,
    }
  }

  return {
    workspace: {
      id: workspaceId,
      name: readString(workspaceData.name) || workspaceId,
      clientId,
      clientEmail: readString(workspaceData.clientEmail),
      publicUrl: readString(workspaceData.publicUrl),
      suggestedPublicUrl: readString(workspaceData.suggestedPublicUrl),
      showOnFrontend: workspaceData.showOnFrontend === true,
      frontEndTags: readStringArray(workspaceData.frontEndTags),
      frontEndProducts: readStringArray(workspaceData.frontEndProducts),
      repoCount: Array.isArray(workspaceData.repos) ? workspaceData.repos.length : 0,
      vercelCount: Array.isArray(workspaceData.vercelProjects) ? workspaceData.vercelProjects.length : 0,
      memberCount: typeof workspaceData.memberCount === "number" ? workspaceData.memberCount : members.length,
      updatedAt: toIsoString(workspaceData.updatedAt),
      hosting: asRecord(workspaceData.hosting),
    },
    client: clientId
      ? {
          id: clientId,
          name:
            readString(clientData.name) ||
            readString(clientData.displayName) ||
            readString(clientData.companyName) ||
            clientId,
          storyId: readString(clientData.storyId),
          contactEmail: readString(clientData.contactEmail),
          portalEmail: readString(clientData.clientPortalEmail),
          deployUrl: readString(clientData.deployUrl),
          websiteUrl: readString(clientData.websiteUrl),
          githubRepos: readStringArray(clientData.githubRepos),
          updatedAt: toIsoString(clientData.updatedAt),
        }
      : null,
    contracts,
    updates,
    statusVideos: statusVideoData.videos,
    members,
    pendingInvites,
    emails,
    messages,
    events,
    fileReferences,
    retainer,
  }
}
