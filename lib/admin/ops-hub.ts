import {
  ADMIN_PRODUCT_KEYS,
  getActiveProductKeys,
  normalizeClientSubscriptions,
  type AdminProductKey,
  type AdminProductSubscription,
} from "@/lib/admin/products"
import type { ModuleKey } from "@/lib/client-directory"
import { getSuggestedWorkspacePublicUrl } from "@/lib/admin/workspace-frontend"
import { contractFromUserDoc, type ClientMembership } from "@/lib/types/client-membership"

export type AdminHubClient = {
  id: string
  name: string
  storyId: string
  status: string
  workspaceId: string | null
  contactEmail: string | null
  portalEmail: string | null
  updatedAt: string | null
  websiteUrl: string | null
  deployUrl: string | null
  showOnFrontend: boolean
  storyModules: ModuleKey[]
  subscriptions: Record<AdminProductKey, AdminProductSubscription>
  activeProducts: AdminProductKey[]
  legacyProductData: boolean
}

export type AdminHubPerson = {
  id: string
  uid: string | null
  name: string
  email: string
  role: string | null
  clientIds: string[]
  activeClientId: string | null
  memberships: Record<string, ClientMembership>
  status: "active" | "pending" | "suspended"
  source: "user" | "pending_client"
  updatedAt: string | null
}

export type AdminHubWorkspace = {
  id: string
  name: string
  clientId: string | null
  ownerUid: string | null
  showOnFrontend: boolean
  publicUrl: string | null
  previewImageUrl: string | null
  suggestedPublicUrl: string | null
  frontEndProducts: ModuleKey[]
  frontEndTags: string[]
  repoSlugs: string[]
  memberCount: number
  repoCount: number
  vercelCount: number
  updatedAt: string | null
}

export type AdminHubProject = {
  id: string
  name: string
  clientId: string | null
  clientName: string | null
  workspaceId: string | null
  status: string
  product: AdminProductKey | null
  githubRepos: string[]
  updatedAt: string | null
}

export type AdminHubTask = {
  id: string
  title: string
  status: string
  clientId: string | null
  clientName: string | null
  workspaceId: string | null
  projectId: string | null
  owner: string | null
  product: AdminProductKey | null
  summary: string | null
  blocker: string | null
  dueAt: string | null
  updatedAt: string | null
  createdAt: string | null
}

export type AdminHubWarning = {
  id: string
  severity: "warning" | "danger"
  label: string
  detail: string
  view: "clients" | "people" | "workspaces" | "tasks" | "billing"
  clientId?: string
  personId?: string
  workspaceId?: string
  projectId?: string
  taskId?: string
}

export type AdminHubPayload = {
  success: true
  data: {
    clients: AdminHubClient[]
    people: AdminHubPerson[]
    workspaces: AdminHubWorkspace[]
    projects: AdminHubProject[]
    tasks: AdminHubTask[]
    warnings: AdminHubWarning[]
    loadedAt: string
  }
}

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

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

function toIsoString(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === "string") return value
  if (typeof value === "number") return new Date(value).toISOString()
  if (typeof value === "object") {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number }
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString()
    const seconds = timestamp.seconds ?? timestamp._seconds
    if (typeof seconds === "number") return new Date(seconds * 1000).toISOString()
  }
  return null
}

function timestampMillis(value: unknown): number {
  const iso = toIsoString(value)
  if (!iso) return 0
  const millis = new Date(iso).getTime()
  return Number.isNaN(millis) ? 0 : millis
}

function looksLikeEmail(value: string | null): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
}

function isPortalPersonRecord(record: Record<string, unknown>, id: string): boolean {
  const storyId = readString(record.storyId)
  const portalAccessStatus = readString(record.portalAccessStatus)
  return Boolean(
    record.recordType === "portal_person" ||
      record.adminApprovalPending === true ||
      readString(record.assignedClientId) ||
      portalAccessStatus === "pending_manual_provision" ||
      portalAccessStatus === "assigned" ||
      looksLikeEmail(id) ||
      looksLikeEmail(storyId)
  )
}

function normalizeProduct(value: unknown): AdminProductKey | null {
  return ADMIN_PRODUCT_KEYS.includes(value as AdminProductKey) ? (value as AdminProductKey) : null
}

const MODULE_KEYS: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]

function readModuleKeys(record: Record<string, unknown>): ModuleKey[] {
  const modules = asRecord(record.modules)
  return MODULE_KEYS.filter((key) => {
    const moduleValue = modules[key]
    if (moduleValue === true) return true
    const moduleRecord = asRecord(moduleValue)
    if ("enabled" in moduleRecord) return moduleRecord.enabled === true

    if (key === "web") return Boolean(readString(record.websiteUrl))
    if (key === "app") return Boolean(readString(record.appUrl))
    if (key === "rd") return Boolean(readString(record.rdUrl))
    if (key === "housing") return Boolean(readString(record.housingUrl))
    if (key === "transportation") return Boolean(readString(record.transportationUrl))
    if (key === "insurance") return Boolean(readString(record.insuranceUrl))
    return false
  })
}

export function normalizeAdminHubClient(id: string, input: unknown): AdminHubClient | null {
  const record = asRecord(input)
  if (isPortalPersonRecord(record, id)) return null

  const subscriptions = normalizeClientSubscriptions(record)
  const activeProducts = getActiveProductKeys(subscriptions)

  return {
    id,
    name: readString(record.name) || readString(record.displayName) || readString(record.storyId) || id,
    storyId: readString(record.storyId) || id,
    status: readString(record.status) || "onboarding",
    workspaceId: readString(record.workspaceId),
    contactEmail: readString(record.contactEmail),
    portalEmail: readString(record.clientPortalEmail),
    updatedAt: toIsoString(record.updatedAt),
    websiteUrl: readString(record.websiteUrl),
    deployUrl: readString(record.deployUrl),
    showOnFrontend: readBoolean(record.showOnFrontend, true),
    storyModules: readModuleKeys(record),
    subscriptions,
    activeProducts,
    legacyProductData: activeProducts.some((key) => subscriptions[key].legacy),
  }
}

export function normalizePendingClientPerson(id: string, input: unknown): AdminHubPerson | null {
  const record = asRecord(input)
  if (!isPortalPersonRecord(record, id)) return null
  const email =
    readString(record.clientPortalEmail) ||
    readString(record.contactEmail) ||
    (looksLikeEmail(readString(record.storyId)) ? readString(record.storyId) : null) ||
    (looksLikeEmail(id) ? id : "")
  const assignedClientId = readString(record.assignedClientId)

  return {
    id: `pending:${id}`,
    uid: readString(record.portalUid),
    name: readString(record.name) || email || id,
    email: email || "",
    role: readString(record.assignedRole) || null,
    clientIds: assignedClientId ? [assignedClientId] : [],
    activeClientId: assignedClientId,
    memberships: {},
    status: assignedClientId ? "active" : "pending",
    source: "pending_client",
    updatedAt: toIsoString(record.updatedAt),
  }
}

export function normalizeUserPerson(uid: string, input: unknown): AdminHubPerson | null {
  const record = asRecord(input)
  const email = readString(record.email)?.toLowerCase() || ""
  if (!email) return null
  const contract = contractFromUserDoc(record)
  const clientIds = contract?.clientIds ?? readStringArray(record.clientIds)
  const activeClientId = contract?.activeClientId ?? readString(record.client_id)
  const role = readString(record.role) || contract?.userRole || null
  const hasSuspendedMembership = contract
    ? Object.values(contract.memberships).some((membership) => membership.status === "suspended")
    : false

  return {
    id: `user:${uid}`,
    uid,
    name: readString(record.displayName) || readString(record.full_name) || readString(record.name) || email,
    email,
    role,
    clientIds,
    activeClientId,
    memberships: contract?.memberships ?? {},
    status: hasSuspendedMembership ? "suspended" : clientIds.length > 0 ? "active" : "pending",
    source: "user",
    updatedAt:
      toIsoString(record.updatedAt) ||
      toIsoString(record.updated_at) ||
      toIsoString(record.createdAt) ||
      toIsoString(record.created_at),
  }
}

export function normalizeAdminHubWorkspace(id: string, input: unknown): AdminHubWorkspace {
  const record = asRecord(input)
  const repos = Array.isArray(record.repos) ? record.repos : []
  const vercelProjects = Array.isArray(record.vercelProjects) ? record.vercelProjects : []
  const repoSlugs = repos
    .map((repo) => readString(asRecord(repo).repoSlug) || readString(asRecord(repo).fullName))
    .filter((value): value is string => Boolean(value))
  return {
    id,
    name: readString(record.name) || id,
    clientId: readString(record.clientId),
    ownerUid: readString(record.ownerUid),
    showOnFrontend: readBoolean(record.showOnFrontend, false),
    publicUrl: readString(record.publicUrl),
    previewImageUrl: readString(record.previewImageUrl),
    suggestedPublicUrl: getSuggestedWorkspacePublicUrl(record),
    frontEndProducts: readStringArray(record.frontEndProducts).filter((value): value is ModuleKey =>
      MODULE_KEYS.includes(value as ModuleKey)
    ),
    frontEndTags: readStringArray(record.frontEndTags),
    repoSlugs,
    memberCount: readNumber(record.memberCount),
    repoCount: repoSlugs.length,
    vercelCount: vercelProjects.length,
    updatedAt: toIsoString(record.updatedAt),
  }
}

export function normalizeAdminHubProject(id: string, input: unknown): AdminHubProject {
  const record = asRecord(input)
  const githubRepos = [
    readString(record.githubRepo),
    ...readStringArray(record.githubRepos),
    ...readStringArray(record.repositoryChains),
  ].filter((repo): repo is string => Boolean(repo))

  return {
    id,
    name: readString(record.name) || readString(record.clientName) || id,
    clientId: readString(record.clientId),
    clientName: readString(record.clientName),
    workspaceId: readString(record.workspaceId),
    status: readString(record.status) || "active",
    product: normalizeProduct(record.product || record.productKey || record.service || record.serviceKey),
    githubRepos: Array.from(new Set(githubRepos)),
    updatedAt: toIsoString(record.updatedAt),
  }
}

export function normalizeAdminHubTask(id: string, input: unknown): AdminHubTask {
  const record = asRecord(input)
  const blocker = readString(record.blocker) || readString(record.blockedReason)
  return {
    id,
    title: readString(record.title) || "Untitled task",
    status: blocker ? "blocked" : readString(record.status) || "proposed",
    clientId: readString(record.clientId),
    clientName: readString(record.clientName),
    workspaceId: readString(record.workspaceId),
    projectId: readString(record.projectId),
    owner: readString(record.owner) || readString(record.assignee),
    product: normalizeProduct(record.product || record.productKey || record.service || record.serviceKey),
    summary: readString(record.summary) || readString(record.description),
    blocker,
    dueAt: toIsoString(record.dueAt) || toIsoString(record.dueDate),
    updatedAt: toIsoString(record.updatedAt),
    createdAt: toIsoString(record.createdAt),
  }
}

export function sortAdminHubByUpdated<T extends { updatedAt: string | null; createdAt?: string | null }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const aTime = timestampMillis(a.updatedAt) || timestampMillis(a.createdAt)
    const bTime = timestampMillis(b.updatedAt) || timestampMillis(b.createdAt)
    return bTime - aTime
  })
}

export function buildAdminHubWarnings(input: {
  clients: AdminHubClient[]
  people: AdminHubPerson[]
  workspaces: AdminHubWorkspace[]
  projects: AdminHubProject[]
  tasks: AdminHubTask[]
}): AdminHubWarning[] {
  const clientIds = new Set(input.clients.map((client) => client.id))
  const workspaceIds = new Set(input.workspaces.map((workspace) => workspace.id))
  const warnings: AdminHubWarning[] = []

  for (const client of input.clients) {
    if (!client.workspaceId) {
      warnings.push({
        id: `client:${client.id}:workspace`,
        severity: "warning",
        label: "Client missing workspace",
        detail: `${client.name} does not have a canonical workspaceId.`,
        view: "clients",
        clientId: client.id,
      })
    }
    if (client.legacyProductData) {
      warnings.push({
        id: `client:${client.id}:legacy-products`,
        severity: "warning",
        label: "Legacy product mapping",
        detail: `${client.name} is using legacy module data for product subscriptions.`,
        view: "billing",
        clientId: client.id,
      })
    }
  }

  for (const person of input.people) {
    if (person.status === "pending" || person.clientIds.length === 0) {
      warnings.push({
        id: `person:${person.id}:assignment`,
        severity: "warning",
        label: "Portal person needs assignment",
        detail: `${person.name} is not attached to an active client membership.`,
        view: "people",
        personId: person.id,
      })
    }
  }

  for (const project of input.projects) {
    if (project.clientId && !clientIds.has(project.clientId)) {
      warnings.push({
        id: `project:${project.id}:client`,
        severity: "danger",
        label: "Project linked to missing client",
        detail: `${project.name} references ${project.clientId}.`,
        view: "workspaces",
        clientId: project.clientId,
        projectId: project.id,
      })
    }
    if (project.workspaceId && !workspaceIds.has(project.workspaceId)) {
      warnings.push({
        id: `project:${project.id}:workspace`,
        severity: "warning",
        label: "Project linked to missing workspace",
        detail: `${project.name} references ${project.workspaceId}.`,
        view: "workspaces",
        workspaceId: project.workspaceId,
        projectId: project.id,
      })
    }
  }

  for (const task of input.tasks) {
    if (task.status === "blocked" || task.blocker) {
      warnings.push({
        id: `task:${task.id}:blocked`,
        severity: "danger",
        label: "Blocked task",
        detail: task.blocker || task.title,
        view: "tasks",
        clientId: task.clientId ?? undefined,
        taskId: task.id,
      })
    }
    if (task.clientId && !clientIds.has(task.clientId)) {
      warnings.push({
        id: `task:${task.id}:client`,
        severity: "warning",
        label: "Task linked to missing client",
        detail: `${task.title} references ${task.clientId}.`,
        view: "tasks",
        clientId: task.clientId,
        taskId: task.id,
      })
    }
  }

  return warnings
}
