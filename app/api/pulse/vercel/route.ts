import { NextRequest, NextResponse } from "next/server"
import { normalizeHost, parseHostSelectorsFromSearchParams, parseProjectSelectorsFromSearchParams } from "@/lib/pulse-selectors"

type VercelDeployment = {
  uid?: string
  id?: string
  name?: string
  url?: string
  alias?: string[]
  state?: "READY" | "BUILDING" | "ERROR" | "CANCELED"
  created?: number
  buildingAt?: number
  readyAt?: number
  target?: "production" | "preview"
  production?: boolean
  projectId?: string
  meta?: {
    githubCommitRef?: string
    githubCommitSha?: string
    githubCommitMessage?: string
  }
  gitSource?: {
    ref?: string
  }
}

type PulseEvent = {
  source: "vercel"
  timestamp: string
  data: Record<string, unknown>
  project?: string
}

function resolveDeploymentUrl(deployment: VercelDeployment): string {
  const raw = deployment.url || deployment.alias?.[0] || (deployment.name ? `${deployment.name}.vercel.app` : "")
  if (!raw) return ""
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  return `https://${raw}`
}

function extractProjectFromDeployment(deployment: VercelDeployment): string {
  const name = (deployment.name || "unknown").toLowerCase()
  if (name) return name
  const commitMessage = deployment.meta?.githubCommitMessage?.toLowerCase() || ""
  const keywords = ["femi", "baya", "jennalyn", "beam", "stripe", "dashboard", "api"]
  for (const keyword of keywords) {
    if (commitMessage.includes(keyword)) return keyword
  }
  return "unknown"
}

function matchesFilters(
  deployment: VercelDeployment,
  hostFilters: Set<string>,
  projectFilters: Set<string>
): boolean {
  if (hostFilters.size === 0 && projectFilters.size === 0) return true

  const url = resolveDeploymentUrl(deployment)
  const host = normalizeHost(url)
  const name = (deployment.name || "").toLowerCase()
  const projectId = (deployment.projectId || "").toLowerCase()

  const hostMatch = host ? hostFilters.has(host) : false
  const projectMatch =
    (Boolean(name) && projectFilters.has(name)) ||
    (Boolean(projectId) && projectFilters.has(projectId))

  return hostMatch || projectMatch
}

export async function GET(req: NextRequest) {
  try {
    const vercelToken = process.env.VERCEL_ACCESS_TOKEN || process.env.VERCEL_TOKEN
    if (!vercelToken) {
      return NextResponse.json({
        events: [],
        source: "vercel",
        totalEvents: 0,
        filters: { hosts: [], projects: [] },
        error: "Vercel token not configured",
      })
    }

    const hostFilters = new Set(parseHostSelectorsFromSearchParams(req.nextUrl.searchParams))
    const projectFilters = new Set(parseProjectSelectorsFromSearchParams(req.nextUrl.searchParams))

    const teamId = process.env.VERCEL_TEAM_ID
    const deploymentsUrl = teamId
      ? `https://api.vercel.com/v6/deployments?teamId=${teamId}&limit=100`
      : "https://api.vercel.com/v6/deployments?limit=100"

    const deploymentsResponse = await fetch(deploymentsUrl, {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!deploymentsResponse.ok) {
      const errorText = await deploymentsResponse.text()
      return NextResponse.json({
        events: [],
        source: "vercel",
        totalEvents: 0,
        filters: { hosts: [...hostFilters], projects: [...projectFilters] },
        error: `Vercel API ${deploymentsResponse.status}: ${errorText}`,
      })
    }

    const data = (await deploymentsResponse.json()) as { deployments?: VercelDeployment[] }
    const deployments = data.deployments || []

    const events: PulseEvent[] = []
    for (const deployment of deployments) {
      if (deployment.state !== "READY") continue
      if (!matchesFilters(deployment, hostFilters, projectFilters)) continue

      const finalUrl = resolveDeploymentUrl(deployment)
      events.push({
        source: "vercel",
        timestamp: new Date(deployment.created || Date.now()).toISOString(),
        project: extractProjectFromDeployment(deployment),
        data: {
          type: "deployment",
          uid: deployment.uid || deployment.id || null,
          projectId: deployment.projectId || null,
          name: deployment.name || null,
          url: finalUrl || null,
          host: normalizeHost(finalUrl),
          state: deployment.state,
          target: deployment.target ?? (deployment.production ? "production" : "preview"),
          commitRef: deployment.meta?.githubCommitRef || deployment.gitSource?.ref || null,
          commitSha: deployment.meta?.githubCommitSha || null,
          commitMessage: deployment.meta?.githubCommitMessage || null,
          created: deployment.created || Date.now(),
          readyAt: deployment.readyAt || null,
          buildingAt: deployment.buildingAt || null,
        },
      })
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      events: events.slice(0, 100),
      source: "vercel",
      totalEvents: events.length,
      filters: { hosts: [...hostFilters], projects: [...projectFilters] },
    })
  } catch (error) {
    console.error("Vercel Pulse API error:", error)
    return NextResponse.json(
      {
        events: [],
        source: "vercel",
        totalEvents: 0,
        filters: { hosts: [], projects: [] },
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
