export type AdminClientRecordType = "relationship" | "portal_person" | "legacy"
export type AdminClientStatus = "active" | "inactive" | "onboarding"
export type AdminDeployStatus = "live" | "building" | "error"
export type AdminStripeStatus = "connected" | "pending" | "error"
export type AdminTaskStatus = "proposed" | "accepted" | "in_progress" | "blocked" | "done" | "declined"

export type AdminClientRecord = {
  id: string
  recordType: AdminClientRecordType
  name: string
  storyId: string
  brands: string[]
  status: AdminClientStatus
  lastActivity: string
  updatedAt: string | null
  workspaceId: string | null
  contactEmail: string | null
  clientPortalEmail: string | null
  portalUid: string | null
  portalAccessStatus: string | null
  adminApprovalPending: boolean
  assignedClientId: string | null
  assignedWorkspaceId: string | null
  assignedRole: string | null
  deployStatus: AdminDeployStatus
  deployUrl: string | null
  websiteUrl: string | null
  appUrl: string | null
  storyVideoUrl: string | null
  githubRepo: string | null
  githubRepos: string[]
  deployHosts: string[]
  stripeStatus: AdminStripeStatus
  revenue: number
  meetings: number
  emails: number
  commits: number
  pulseSummary: string | null
  showOnFrontend: boolean
}

export type AdminProjectRecord = {
  id: string
  name: string
  clientId: string | null
  clientName: string | null
  workspaceId: string | null
  status: string
  updatedAt: string | null
  clientPortalEmail: string | null
  clientPortalEmails: string[]
  githubRepo: string | null
  githubRepos: string[]
  repositoryChains: string[]
  sourceNgo: string | null
}

export type AdminTaskRecord = {
  id: string
  title: string
  status: AdminTaskStatus
  clientId: string | null
  clientName: string | null
  workspaceId: string | null
  projectId: string | null
  owner: string | null
  summary: string | null
  blocker: string | null
  updatedAt: string | null
  createdAt: string | null
  dueAt: string | null
}

export type AdminActivityRecord = {
  id: string
  type: "client" | "project" | "task" | "system"
  title: string
  detail: string
  href: string | null
  at: string | null
  tone: "default" | "warning" | "success" | "danger"
}

export type AdminOpsMetrics = {
  relationships: number
  portalPeople: number
  needsAssignment: number
  activeProjects: number
  openTasks: number
  blockedTasks: number
  staleRelationships: number
  systemWarnings: number
}

export function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : []
}

export function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function toIsoString(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === "string") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toISOString()
  }
  if (typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value === "object") {
    const timestamp = value as {
      _seconds?: number
      seconds?: number
      _nanoseconds?: number
      nanoseconds?: number
      toDate?: () => Date
    }
    if (typeof timestamp.toDate === "function") {
      const date = timestamp.toDate()
      return Number.isNaN(date.getTime()) ? null : date.toISOString()
    }
    const seconds = timestamp._seconds ?? timestamp.seconds
    const nanoseconds = timestamp._nanoseconds ?? timestamp.nanoseconds ?? 0
    if (typeof seconds === "number") {
      return new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000)).toISOString()
    }
  }
  return null
}

export function toTimestampMillis(value: unknown): number {
  const iso = toIsoString(value)
  if (!iso) return 0
  const timestamp = new Date(iso).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function formatAdminDate(value: unknown): string {
  const iso = toIsoString(value)
  if (!iso) return "No timestamp"
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

export function formatAdminDateTime(value: unknown): string {
  const iso = toIsoString(value)
  if (!iso) return "No timestamp"
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeClientStatus(value: unknown): AdminClientStatus {
  return value === "active" || value === "inactive" || value === "onboarding" ? value : "onboarding"
}

function normalizeDeployStatus(value: unknown): AdminDeployStatus {
  return value === "live" || value === "error" || value === "building" ? value : "building"
}

function normalizeStripeStatus(value: unknown): AdminStripeStatus {
  return value === "connected" || value === "error" || value === "pending" ? value : "pending"
}

function normalizeTaskStatus(value: unknown): AdminTaskStatus {
  if (value === "accepted" || value === "blocked" || value === "done" || value === "declined" || value === "proposed") return value
  if (value === "in-progress" || value === "in_progress") return "in_progress"
  return "proposed"
}

export function isPortalPersonRecord(client: Pick<AdminClientRecord, "recordType" | "adminApprovalPending" | "assignedClientId" | "portalAccessStatus" | "id" | "storyId">): boolean {
  return Boolean(
    client.recordType === "portal_person" ||
      client.adminApprovalPending ||
      client.assignedClientId ||
      client.portalAccessStatus === "pending_manual_provision" ||
      client.portalAccessStatus === "assigned" ||
      looksLikeEmail(client.id) ||
      looksLikeEmail(client.storyId)
  )
}

export function isRelationshipRecord(client: AdminClientRecord): boolean {
  if (client.recordType === "relationship") return true
  if (client.recordType === "portal_person" || client.recordType === "legacy") return false
  return !isPortalPersonRecord(client)
}

export function normalizeAdminClientRecord(value: unknown): AdminClientRecord {
  const record = asRecord(value)
  const id = readString(record.id) || readString(record.storyId) || "unknown"
  const storyId = readString(record.storyId) || id
  const name = readString(record.name) || readString(record.contactName) || readString(record.clientPortalEmail) || storyId
  const portalAccessStatus = readString(record.portalAccessStatus) || null
  const adminApprovalPending = readBoolean(record.adminApprovalPending)
  const assignedClientId = readString(record.assignedClientId) || null
  const inferredPortalPerson = Boolean(
    record.recordType === "portal_person" ||
      adminApprovalPending ||
      assignedClientId ||
      portalAccessStatus === "pending_manual_provision" ||
      portalAccessStatus === "assigned" ||
      looksLikeEmail(id) ||
      looksLikeEmail(storyId)
  )

  return {
    id,
    recordType:
      record.recordType === "portal_person" || record.recordType === "legacy" || record.recordType === "relationship"
        ? record.recordType
        : inferredPortalPerson
          ? "portal_person"
          : "relationship",
    name,
    storyId,
    brands: readStringArray(record.brands),
    status: normalizeClientStatus(record.status),
    lastActivity: readString(record.lastActivity) || "Recently updated",
    updatedAt: toIsoString(record.updatedAt),
    workspaceId: readString(record.workspaceId) || null,
    contactEmail: readString(record.contactEmail) || null,
    clientPortalEmail: readString(record.clientPortalEmail) || null,
    portalUid: readString(record.portalUid) || null,
    portalAccessStatus,
    adminApprovalPending,
    assignedClientId,
    assignedWorkspaceId: readString(record.assignedWorkspaceId) || null,
    assignedRole: readString(record.assignedRole) || null,
    deployStatus: normalizeDeployStatus(record.deployStatus),
    deployUrl: readString(record.deployUrl) || null,
    websiteUrl: readString(record.websiteUrl) || null,
    appUrl: readString(record.appUrl) || null,
    storyVideoUrl: readString(record.storyVideoUrl) || null,
    githubRepo: readString(record.githubRepo) || null,
    githubRepos: readStringArray(record.githubRepos),
    deployHosts: readStringArray(record.deployHosts),
    stripeStatus: normalizeStripeStatus(record.stripeStatus),
    revenue: readNumber(record.revenue),
    meetings: readNumber(record.meetings),
    emails: readNumber(record.emails),
    commits: readNumber(record.commits),
    pulseSummary: readString(record.pulseSummary) || null,
    showOnFrontend: readBoolean(record.showOnFrontend, true),
  }
}

export function normalizeAdminProjectRecord(value: unknown): AdminProjectRecord {
  const record = asRecord(value)
  const id = readString(record.id) || readString(record.projectId) || "unknown"
  const clientId = readString(record.clientId) || null
  return {
    id,
    name: readString(record.name) || readString(record.clientName) || id,
    clientId,
    clientName: readString(record.clientName) || null,
    workspaceId: readString(record.workspaceId) || null,
    status: readString(record.status) || "active",
    updatedAt: toIsoString(record.updatedAt),
    clientPortalEmail: readString(record.clientPortalEmail) || null,
    clientPortalEmails: readStringArray(record.clientPortalEmails),
    githubRepo: readString(record.githubRepo) || null,
    githubRepos: readStringArray(record.githubRepos),
    repositoryChains: readStringArray(record.repositoryChains),
    sourceNgo: readString(record.sourceNgo) || null,
  }
}

export function normalizeAdminTaskRecord(value: unknown): AdminTaskRecord {
  const record = asRecord(value)
  const id = readString(record.id) || "unknown"
  const blocker = readString(record.blocker) || readString(record.blockedReason) || null
  return {
    id,
    title: readString(record.title) || "Untitled task",
    status: blocker ? "blocked" : normalizeTaskStatus(record.status),
    clientId: readString(record.clientId) || null,
    clientName: readString(record.clientName) || null,
    workspaceId: readString(record.workspaceId) || null,
    projectId: readString(record.projectId) || null,
    owner: readString(record.owner) || readString(record.assignee) || null,
    summary: readString(record.summary) || readString(record.description) || null,
    blocker,
    updatedAt: toIsoString(record.updatedAt),
    createdAt: toIsoString(record.createdAt),
    dueAt: toIsoString(record.dueAt) || toIsoString(record.dueDate),
  }
}

export function getClientPrimaryEmail(client: AdminClientRecord): string | null {
  return client.clientPortalEmail || client.contactEmail
}

export function getClientActivityMillis(client: AdminClientRecord): number {
  return toTimestampMillis(client.updatedAt) || toTimestampMillis(client.lastActivity)
}

export function getRelationshipHealth(client: AdminClientRecord, projects: AdminProjectRecord[]): { label: string; tone: "good" | "warning" | "setup" } {
  if (client.status === "onboarding") return { label: "Setup", tone: "setup" }
  if (!client.storyVideoUrl && !client.websiteUrl && !client.deployUrl) return { label: "Needs Proof", tone: "warning" }
  if (!projects.some((project) => project.clientId === client.id)) return { label: "No Project", tone: "warning" }
  const lastTouch = getClientActivityMillis(client)
  if (!lastTouch || Date.now() - lastTouch > 21 * 86_400_000) return { label: "Follow Up", tone: "warning" }
  return { label: "Healthy", tone: "good" }
}

export function isTaskOpen(task: AdminTaskRecord): boolean {
  return task.status !== "done" && task.status !== "declined"
}

export function isTaskBlocked(task: AdminTaskRecord): boolean {
  return task.status === "blocked" || Boolean(task.blocker)
}

export function buildAdminActivity(params: {
  clients: AdminClientRecord[]
  projects: AdminProjectRecord[]
  tasks: AdminTaskRecord[]
}): AdminActivityRecord[] {
  const clientActivity = params.clients.slice(0, 12).map((client) => ({
    id: `client:${client.id}`,
    type: "client" as const,
    title: client.name,
    detail: client.lastActivity,
    href: client.recordType === "relationship" ? `/dashboard/clients/${encodeURIComponent(client.id)}` : "/dashboard/clients",
    at: client.updatedAt,
    tone: client.adminApprovalPending ? "warning" as const : "default" as const,
  }))
  const projectActivity = params.projects.slice(0, 12).map((project) => ({
    id: `project:${project.id}`,
    type: "project" as const,
    title: project.name,
    detail: project.clientName || project.clientId || project.workspaceId || "Project updated",
    href: "/dashboard/web-development",
    at: project.updatedAt,
    tone: project.status === "archived" ? "warning" as const : "default" as const,
  }))
  const taskActivity = params.tasks.slice(0, 12).map((task) => ({
    id: `task:${task.id}`,
    type: "task" as const,
    title: task.title,
    detail: task.blocker || task.summary || task.status,
    href: "/dashboard/command",
    at: task.updatedAt || task.createdAt,
    tone: isTaskBlocked(task) ? "danger" as const : task.status === "done" ? "success" as const : "default" as const,
  }))

  return [...clientActivity, ...projectActivity, ...taskActivity]
    .sort((a, b) => toTimestampMillis(b.at) - toTimestampMillis(a.at))
    .slice(0, 18)
}

export function computeAdminOpsMetrics(params: {
  clients: AdminClientRecord[]
  projects: AdminProjectRecord[]
  tasks: AdminTaskRecord[]
  warnings?: number
}): AdminOpsMetrics {
  const relationships = params.clients.filter(isRelationshipRecord)
  const portalPeople = params.clients.filter(isPortalPersonRecord)
  const activeProjects = params.projects.filter((project) => project.status !== "archived")
  const openTasks = params.tasks.filter(isTaskOpen)
  const staleRelationships = relationships.filter((client) => getRelationshipHealth(client, params.projects).label === "Follow Up")
  return {
    relationships: relationships.length,
    portalPeople: portalPeople.length,
    needsAssignment: portalPeople.filter((client) => client.adminApprovalPending || !client.assignedClientId).length,
    activeProjects: activeProjects.length,
    openTasks: openTasks.length,
    blockedTasks: openTasks.filter(isTaskBlocked).length,
    staleRelationships: staleRelationships.length,
    systemWarnings: params.warnings ?? 0,
  }
}

export function sortByUpdatedDesc<T extends { updatedAt?: string | null; createdAt?: string | null; lastActivity?: string | null }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const aTime = toTimestampMillis(a.updatedAt) || toTimestampMillis(a.createdAt) || toTimestampMillis(a.lastActivity)
    const bTime = toTimestampMillis(b.updatedAt) || toTimestampMillis(b.createdAt) || toTimestampMillis(b.lastActivity)
    return bTime - aTime
  })
}
