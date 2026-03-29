import type { ClientDirectoryEntry } from "@/lib/client-directory"
import { normalizeHost } from "@/lib/pulse-selectors"

export type AdminAreaId =
  | "web-development"
  | "transportation"
  | "real-estate"
  | "staff"
  | "beam-participants"

export type AdminAreaDefinition = {
  id: AdminAreaId
  label: string
  description: string
}

export type AdminAreaSummary = AdminAreaDefinition & {
  trackedRecords: number
  websiteCount: number
  storyCount: number
  missingAssignments: number
}

export type AdminVercelProject = {
  id: string
  name: string
  repoSlug?: string
  domains: string[]
  customDomains: string[]
  productionUrl?: string
  deploymentState?: string
  linkedClientId?: string
  linkedClientName?: string
}

export type AdminBeamDirectoryEntry = {
  id: string
  label: string
  title: string
  subtitle?: string
  url: string
  source?: string
}

export type AdminPulseEvent = {
  source?: string
  project?: string
  data?: unknown
}

export const ADMIN_AREAS: AdminAreaDefinition[] = [
  {
    id: "web-development",
    label: "Web Development",
    description: "Client websites, deploys, repositories, and aggregation coverage.",
  },
  {
    id: "transportation",
    label: "Transportation",
    description: "Transportation operations, logistics, and related client records.",
  },
  {
    id: "real-estate",
    label: "Real Estate",
    description: "Property, housing, and real-estate aligned client records.",
  },
  {
    id: "staff",
    label: "ReadyAimGo Staff",
    description: "Internal staff and employee records.",
  },
  {
    id: "beam-participants",
    label: "BEAM Participants",
    description: "BEAM-linked participants, projects, and assignment coverage.",
  },
]

function toSearchText(values: Array<string | undefined | null>): string {
  return values.filter(Boolean).join(" ").toLowerCase()
}

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

export function getClientSearchText(client: ClientDirectoryEntry): string {
  return toSearchText([
    client.id,
    client.storyId,
    client.name,
    ...(client.brands ?? []),
    client.websiteUrl,
    client.appUrl,
    client.appStoreUrl,
    client.appStoreConnectAppId,
    client.appStoreConnectName,
    client.appStoreConnectBundleId,
    client.deployUrl,
    client.githubRepo,
    ...(client.githubRepos ?? []),
    ...(client.deployHosts ?? []),
    client.vercelProjectName,
    ...(client.vercelProjectDomains ?? []),
    client.transportationUrl,
    client.housingUrl,
    client.pulseSummary,
  ])
}

export function clientHasWebsiteSignal(client: ClientDirectoryEntry): boolean {
  return Boolean(
    client.websiteUrl ||
      client.deployUrl ||
      client.githubRepo ||
      (client.githubRepos && client.githubRepos.length > 0) ||
      (client.deployHosts && client.deployHosts.length > 0) ||
      client.vercelProjectName ||
      (client.vercelProjectDomains && client.vercelProjectDomains.length > 0)
  )
}

export function clientHasAppSignal(client: ClientDirectoryEntry): boolean {
  return Boolean(
    client.appUrl ||
      client.appStoreUrl ||
      client.appStoreConnectAppId ||
      client.appStoreConnectName ||
      client.appStoreConnectBundleId ||
      client.appStoreConnectVersionString ||
      client.appStoreConnectBuildNumber
  )
}

export function clientMatchesArea(client: ClientDirectoryEntry, areaId: AdminAreaId): boolean {
  const text = getClientSearchText(client)

  switch (areaId) {
    case "web-development":
      return clientHasWebsiteSignal(client)
    case "transportation":
      return Boolean(client.transportationUrl) || containsAny(text, ["transport", "fleet", "logistics"])
    case "real-estate":
      return Boolean(client.housingUrl) || containsAny(text, ["real estate", "housing", "property", "listing"])
    case "staff":
      return containsAny(text, ["readyaimgo staff", "readyaimgo team", "employee", "staff"])
    case "beam-participants":
      return containsAny(text, ["beam"])
    default:
      return false
  }
}

export function getClientsForArea(clients: ClientDirectoryEntry[], areaId: AdminAreaId): ClientDirectoryEntry[] {
  return clients.filter((client) => clientMatchesArea(client, areaId))
}

export function getVercelProjectSearchText(project: AdminVercelProject): string {
  return toSearchText([
    project.id,
    project.name,
    project.repoSlug,
    project.productionUrl,
    project.linkedClientId,
    project.linkedClientName,
    ...project.domains,
    ...project.customDomains,
  ])
}

export function getVercelProjectHosts(project: AdminVercelProject): string[] {
  return [...new Set(
    [project.productionUrl, ...project.domains, ...project.customDomains]
      .map((value) => (typeof value === "string" ? normalizeHost(value) : null))
      .filter((value): value is string => Boolean(value))
  )]
}

export function getBeamDirectoryEntryHost(entry: AdminBeamDirectoryEntry): string | null {
  return normalizeHost(entry.url)
}

export function findBeamDirectoryMatchesForProject(
  project: AdminVercelProject,
  beamEntries: AdminBeamDirectoryEntry[]
): AdminBeamDirectoryEntry[] {
  const projectHosts = new Set(getVercelProjectHosts(project))
  const normalizedProjectName = normalizeMatchText(project.name)
  const normalizedRepoSlug = normalizeMatchText(project.repoSlug ?? "")

  return beamEntries.filter((entry) => {
    const beamHost = getBeamDirectoryEntryHost(entry)
    if (beamHost && projectHosts.has(beamHost)) {
      return true
    }

    const normalizedEntryLabel = normalizeMatchText(entry.label)
    const normalizedEntryTitle = normalizeMatchText(entry.title)
    if (normalizedProjectName) {
      if (normalizedEntryLabel === normalizedProjectName || normalizedEntryTitle === normalizedProjectName) {
        return true
      }
    }

    if (normalizedRepoSlug) {
      if (normalizedEntryLabel === normalizedRepoSlug || normalizedEntryTitle === normalizedRepoSlug) {
        return true
      }
    }

    return false
  })
}

export function vercelProjectMatchesArea(project: AdminVercelProject, areaId: AdminAreaId): boolean {
  const text = getVercelProjectSearchText(project)

  switch (areaId) {
    case "web-development":
      return true
    case "transportation":
      return containsAny(text, ["transport", "fleet", "logistics"])
    case "real-estate":
      return containsAny(text, ["real estate", "housing", "property", "listing"])
    case "staff":
      return containsAny(text, ["employee", "staff", "internal"])
    case "beam-participants":
      return containsAny(text, ["beam"])
    default:
      return false
  }
}

export function getVercelProjectPrimaryArea(project: AdminVercelProject): AdminAreaId {
  const preferredOrder: AdminAreaId[] = [
    "beam-participants",
    "transportation",
    "real-estate",
    "staff",
    "web-development",
  ]

  for (const areaId of preferredOrder) {
    if (vercelProjectMatchesArea(project, areaId)) {
      return areaId
    }
  }

  return "web-development"
}

export function getAreaSummary(
  clients: ClientDirectoryEntry[],
  vercelProjects: AdminVercelProject[],
  areaId: AdminAreaId
): AdminAreaSummary {
  const definition = ADMIN_AREAS.find((area) => area.id === areaId)
  if (!definition) {
    throw new Error(`Unknown admin area: ${areaId}`)
  }

  const areaClients = getClientsForArea(clients, areaId)
  const areaProjects = vercelProjects.filter((project) => vercelProjectMatchesArea(project, areaId))

  return {
    ...definition,
    trackedRecords: areaClients.length,
    websiteCount: areaClients.filter((client) => clientHasWebsiteSignal(client)).length,
    storyCount: areaClients.filter((client) => Boolean(client.storyVideoUrl?.trim())).length,
    missingAssignments: areaProjects.filter((project) => !project.linkedClientId).length,
  }
}

export function getOperationalAlerts(
  clients: ClientDirectoryEntry[],
  vercelProjects: AdminVercelProject[]
): string[] {
  const alerts: string[] = []
  const webClients = getClientsForArea(clients, "web-development")
  const beamClients = getClientsForArea(clients, "beam-participants")

  const unlinkedProjects = vercelProjects.filter((project) => !project.linkedClientId)
  if (unlinkedProjects.length > 0) {
    alerts.push(`${unlinkedProjects.length} Vercel project(s) still need a client assignment.`)
  }

  const webClientsMissingWebsite = webClients.filter((client) => !client.websiteUrl?.trim() && !client.deployUrl?.trim())
  if (webClientsMissingWebsite.length > 0) {
    alerts.push(`${webClientsMissingWebsite.length} web-development record(s) are missing a primary website or deploy URL.`)
  }

  const beamClientsMissingStory = beamClients.filter((client) => !client.storyVideoUrl?.trim())
  if (beamClientsMissingStory.length > 0) {
    alerts.push(`${beamClientsMissingStory.length} BEAM participant record(s) are missing a story/activity asset.`)
  }

  if (beamClients.length === 0) {
    alerts.push("BEAM participant coverage is still heuristic and no dedicated participant records are configured yet.")
  }

  return alerts
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value.toLowerCase()
  try {
    return JSON.stringify(value).toLowerCase()
  } catch {
    return ""
  }
}

export function pulseEventMatchesArea(event: AdminPulseEvent, areaId: AdminAreaId): boolean {
  const text = toSearchText([event.source, event.project, stringifyUnknown(event.data)])

  switch (areaId) {
    case "web-development":
      if (event.source === "github" || event.source === "vercel") return true
      return containsAny(text, ["web", "website", "deploy", "deployment", "repo", "github", "vercel", "dashboard", "api"])
    case "transportation":
      return containsAny(text, ["transport", "fleet", "logistics", "delivery"])
    case "real-estate":
      return containsAny(text, ["real estate", "housing", "property", "listing"])
    case "staff":
      return containsAny(text, ["employee", "staff", "team member", "internal"])
    case "beam-participants":
      return containsAny(text, ["beam"])
    default:
      return false
  }
}

export function countPulseEventsForArea(events: AdminPulseEvent[], areaId: AdminAreaId): number {
  return events.filter((event) => pulseEventMatchesArea(event, areaId)).length
}
