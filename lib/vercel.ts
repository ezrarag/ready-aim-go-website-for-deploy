import type { ClientDirectoryEntry } from "@/lib/client-directory"
import { collectClientDeployHosts, collectClientGithubRepos, normalizeHost, parseRepoSlug } from "@/lib/pulse-selectors"

type VercelProjectApi = {
  id?: string
  name?: string
  framework?: string | null
  createdAt?: number
  updatedAt?: number
  link?: {
    type?: string
    repo?: string
    org?: string
    repoId?: number | string
    productionBranch?: string
  }
}

type VercelProjectDomainApi = {
  name?: string
  apexName?: string
  verified?: boolean
}

type VercelDeploymentApi = {
  uid?: string
  id?: string
  url?: string
  alias?: string[]
  state?: "READY" | "BUILDING" | "ERROR" | "CANCELED"
  target?: "production" | "preview"
  created?: number
  readyAt?: number
}

export interface VercelProjectSummary {
  id: string
  name: string
  framework?: string
  repoSlug?: string
  domains: string[]
  customDomains: string[]
  productionUrl?: string
  deploymentState?: string
  createdAt?: string
  updatedAt?: string
  readyAt?: string
}

export interface VercelProjectMatch {
  project: VercelProjectSummary
  score: number
  reasons: string[]
}

function getVercelToken(): string {
  const token = process.env.VERCEL_ACCESS_TOKEN || process.env.VERCEL_TOKEN
  if (!token) {
    throw new Error("Vercel token not configured")
  }
  return token
}

function withTeamId(path: string): string {
  const teamId = process.env.VERCEL_TEAM_ID
  if (!teamId) return path
  const join = path.includes("?") ? "&" : "?"
  return `${path}${join}teamId=${encodeURIComponent(teamId)}`
}

async function vercelFetch<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.vercel.com${withTeamId(path)}`, {
    headers: {
      Authorization: `Bearer ${getVercelToken()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vercel API ${response.status}: ${errorText}`)
  }

  return (await response.json()) as T
}

function toIsoString(value?: number): string | undefined {
  if (!value || !Number.isFinite(value)) return undefined
  return new Date(value).toISOString()
}

function resolveRepoSlug(project: VercelProjectApi): string | undefined {
  const org = project.link?.org?.trim()
  const repo = project.link?.repo?.trim()
  if (org && repo) return parseRepoSlug(`${org}/${repo}`) ?? undefined
  if (repo) return parseRepoSlug(repo) ?? undefined
  return undefined
}

function resolveProductionUrl(deployment?: VercelDeploymentApi, domains: string[] = []): string | undefined {
  const preferredDomain = domains[0]
  if (preferredDomain) return `https://${preferredDomain}`

  const raw = deployment?.alias?.[0] || deployment?.url
  if (!raw) return undefined
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  return `https://${raw}`
}

function normalizeProjectDomains(domains: VercelProjectDomainApi[]): { domains: string[]; customDomains: string[] } {
  const normalized = domains
    .flatMap((domain) => [domain.name, domain.apexName])
    .map((value) => (typeof value === "string" ? normalizeHost(value) : null))
    .filter((value): value is string => Boolean(value))

  return {
    domains: [...new Set(normalized)],
    customDomains: [...new Set(normalized.filter((host) => !host.endsWith(".vercel.app")))],
  }
}

async function fetchProjectDomains(projectId: string): Promise<VercelProjectDomainApi[]> {
  const data = await vercelFetch<{ domains?: VercelProjectDomainApi[] }>(
    `/v9/projects/${encodeURIComponent(projectId)}/domains?limit=100`
  )
  return Array.isArray(data.domains) ? data.domains : []
}

async function fetchLatestProductionDeployment(projectId: string): Promise<VercelDeploymentApi | undefined> {
  const data = await vercelFetch<{ deployments?: VercelDeploymentApi[] }>(
    `/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=1`
  )
  return Array.isArray(data.deployments) ? data.deployments[0] : undefined
}

export async function listVercelProjects(): Promise<VercelProjectSummary[]> {
  const data = await vercelFetch<{ projects?: VercelProjectApi[] }>("/v9/projects?limit=100")
  const projects = Array.isArray(data.projects) ? data.projects : []

  const hydrated = await Promise.all(
    projects.map(async (project) => {
      const projectId = project.id
      const projectName = project.name
      if (!projectId || !projectName) return null

      const [domainData, latestDeployment] = await Promise.all([
        fetchProjectDomains(projectId).catch(() => []),
        fetchLatestProductionDeployment(projectId).catch(() => undefined),
      ])

      const { domains, customDomains } = normalizeProjectDomains(domainData)
      return {
        id: projectId,
        name: projectName,
        framework: project.framework ?? undefined,
        repoSlug: resolveRepoSlug(project),
        domains,
        customDomains,
        productionUrl: resolveProductionUrl(latestDeployment, customDomains.length > 0 ? customDomains : domains),
        deploymentState: latestDeployment?.state,
        createdAt: toIsoString(project.createdAt),
        updatedAt: toIsoString(project.updatedAt),
        readyAt: toIsoString(latestDeployment?.readyAt),
      } satisfies VercelProjectSummary
    })
  )

  return hydrated.filter((project): project is VercelProjectSummary => Boolean(project))
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
}

export function matchVercelProjectToClient(
  client: ClientDirectoryEntry,
  projects: VercelProjectSummary[]
): VercelProjectMatch | null {
  const clientRepos = new Set(collectClientGithubRepos(client))
  const clientHosts = new Set(collectClientDeployHosts(client))
  const storyId = normalizeText(client.storyId || "")
  const clientName = normalizeText(client.name || "")

  let best: VercelProjectMatch | null = null

  for (const project of projects) {
    let score = 0
    const reasons: string[] = []
    const projectName = normalizeText(project.name)

    if (project.repoSlug && clientRepos.has(project.repoSlug)) {
      score += 100
      reasons.push(`repo:${project.repoSlug}`)
    }

    const projectHosts = new Set(
      [...project.domains, project.productionUrl || ""]
        .map((value) => normalizeHost(value))
        .filter((value): value is string => Boolean(value))
    )

    const matchingHosts = [...clientHosts].filter((host) => projectHosts.has(host))
    if (matchingHosts.length > 0) {
      score += 90
      reasons.push(`host:${matchingHosts[0]}`)
    }

    if (storyId && projectName === storyId) {
      score += 60
      reasons.push(`story:${client.storyId}`)
    }

    if (clientName && projectName === clientName) {
      score += 40
      reasons.push(`name:${client.name}`)
    }

    if (score === 0) continue

    if (!best || score > best.score) {
      best = { project, score, reasons }
    }
  }

  return best
}

export function buildClientUpdatesFromVercelProject(
  client: ClientDirectoryEntry | Pick<ClientDirectoryEntry, "deployUrl" | "deployHosts" | "githubRepo" | "githubRepos" | "websiteUrl">,
  project: VercelProjectSummary
): Record<string, unknown> {
  const githubRepos = [...new Set([...(client.githubRepos ?? []), client.githubRepo ?? "", project.repoSlug ?? ""].map((value) => parseRepoSlug(value || "")).filter((value): value is string => Boolean(value)))]
  const deployHosts = [
    ...(client.deployHosts ?? []),
    ...(project.domains ?? []),
    project.productionUrl ?? "",
  ]
    .map((value) => normalizeHost(value))
    .filter((value): value is string => Boolean(value))

  const uniqueDeployHosts = [...new Set(deployHosts)]
  const preferredWebsiteHost = project.customDomains[0] || uniqueDeployHosts.find((host) => !host.endsWith(".vercel.app"))
  const productionUrl = project.productionUrl || (preferredWebsiteHost ? `https://${preferredWebsiteHost}` : undefined)

  return {
    githubRepo: githubRepos[0] ?? null,
    githubRepos,
    deployUrl: productionUrl ?? client.deployUrl ?? null,
    deployHosts: uniqueDeployHosts,
    deployStatus: project.deploymentState === "ERROR" ? "error" : productionUrl ? "live" : "building",
    lastDeploy: project.readyAt ?? null,
    websiteUrl: client.websiteUrl || !preferredWebsiteHost ? client.websiteUrl ?? null : `https://${preferredWebsiteHost}`,
    vercelProjectId: project.id,
    vercelProjectName: project.name,
    vercelProjectDomains: project.domains,
    vercelProjectUpdatedAt: project.updatedAt ?? null,
    updatedAt: new Date().toISOString(),
  }
}

export function findUnlinkedVercelProjects(
  clients: ClientDirectoryEntry[],
  projects: VercelProjectSummary[]
): Array<VercelProjectSummary & { linkedClientId?: string; linkedClientName?: string }> {
  const linkedByProjectId = new Map<string, { id: string; name: string }>()

  for (const client of clients) {
    const match = matchVercelProjectToClient(client, projects)
    if (match) {
      linkedByProjectId.set(match.project.id, { id: client.id, name: client.name })
    }
  }

  return projects.map((project) => ({
    ...project,
    linkedClientId: linkedByProjectId.get(project.id)?.id,
    linkedClientName: linkedByProjectId.get(project.id)?.name,
  }))
}

function toHttpsUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed

  const host = normalizeHost(trimmed)
  return host ? `https://${host}` : null
}

export function getClientPreferredProductionUrl(
  client: Pick<ClientDirectoryEntry, "deployUrl" | "deployHosts" | "websiteUrl" | "vercelProjectDomains">
): string | null {
  const normalizedDomains = [
    ...(client.vercelProjectDomains ?? []),
    ...(client.deployHosts ?? []),
  ]
    .map((value) => normalizeHost(value))
    .filter((value): value is string => Boolean(value))

  const uniqueDomains = [...new Set(normalizedDomains)]
  const customDomain = uniqueDomains.find((host) => !host.endsWith(".vercel.app"))
  if (customDomain) {
    return `https://${customDomain}`
  }

  const deployUrl = toHttpsUrl(client.deployUrl ?? "")
  if (deployUrl) {
    return deployUrl
  }

  const fallbackVercelDomain = uniqueDomains[0]
  if (fallbackVercelDomain) {
    return `https://${fallbackVercelDomain}`
  }

  return toHttpsUrl(client.websiteUrl ?? "")
}

export function slugifyProjectName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
