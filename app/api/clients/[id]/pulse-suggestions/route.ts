import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { getClientDirectoryEntryById, getFirestoreDb } from "@/lib/firestore"
import {
  collectClientDeployHosts,
  collectClientGithubRepos,
  normalizeHost,
  parseRepoSlug,
} from "@/lib/pulse-selectors"
import { pulseReportSchema, summarizePulseReport } from "@/lib/pulse-report"
import type { PulseReport } from "@/lib/pulse-report"

type PulseEvent = {
  source: "github" | "vercel"
  timestamp: string
  project?: string
  data?: Record<string, unknown>
}

function eventUrl(event: PulseEvent): string | null {
  const url = event?.data?.url
  return typeof url === "string" ? url : null
}

function eventRepo(event: PulseEvent): string | null {
  const repo = event?.data?.repo
  if (typeof repo === "string") return parseRepoSlug(repo)
  const url = eventUrl(event)
  if (!url) return null
  const marker = "github.com/"
  const idx = url.toLowerCase().indexOf(marker)
  if (idx < 0) return null
  const suffix = url.slice(idx + marker.length)
  const [owner, name] = suffix.split("/")
  if (!owner || !name) return null
  return parseRepoSlug(`${owner}/${name}`)
}

function eventHost(event: PulseEvent): string | null {
  const hostValue = event?.data?.host
  if (typeof hostValue === "string") {
    const normalized = normalizeHost(hostValue)
    if (normalized) return normalized
  }
  const url = eventUrl(event)
  if (!url) return null
  return normalizeHost(url)
}

function buildPulsePath(base: string, key: string, values: string[]): string {
  if (values.length === 0) return base
  const qs = new URLSearchParams()
  for (const value of values) {
    qs.append(key, value)
  }
  return `${base}?${qs.toString()}`
}

async function fetchPulseEvents(origin: string, path: string): Promise<PulseEvent[]> {
  try {
    const res = await fetch(`${origin}${path}`, { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.events) ? (data.events as PulseEvent[]) : []
  } catch {
    return []
  }
}

function matchesClient(event: PulseEvent, deployHosts: Set<string>, repoSlugs: Set<string>): boolean {
  if (event.source === "vercel") {
    if (deployHosts.size === 0) return false
    const host = eventHost(event)
    return !!host && deployHosts.has(host)
  }

  if (event.source === "github") {
    if (repoSlugs.size === 0) return false
    const repo = eventRepo(event)
    return !!repo && repoSlugs.has(repo)
  }

  return false
}

function fallbackPulseReport(client: { id: string; name: string }, matched: PulseEvent[], githubRepos: string[], deployHosts: string[]): PulseReport {
  const matchedGithub = matched.filter((e) => e.source === "github")
  const matchedVercel = matched.filter((e) => e.source === "vercel")

  const snapshot = {
    clientId: client.id,
    clientName: client.name,
    generatedAt: new Date().toISOString(),
    matchedEventCount: matched.length,
    matchedGithubEventCount: matchedGithub.length,
    matchedVercelEventCount: matchedVercel.length,
    githubRepos,
    deployHosts,
  }

  if (matched.length === 0) {
    return {
      snapshot,
      workItems: [
        {
          title: "Verify selectors and trigger new activity",
          detail: "No matching GitHub/Vercel events found for this client yet.",
          source: "mixed",
          priority: "medium",
          status: "todo",
          ownerRole: "Platform Operator",
          evidence: [],
        },
      ],
      roles: [
        {
          name: "Platform Operator",
          focus: "Restore event visibility for this client",
          responsibilities: [
            "Confirm githubRepos/deployHosts selectors on the client record",
            "Trigger a commit and deployment to produce fresh Pulse events",
          ],
          nextActions: ["Regenerate Pulse suggestions after a new commit or deployment"],
        },
      ],
    }
  }

  return {
    snapshot,
    workItems: matched.slice(0, 6).map((event) => ({
      title: event.source === "github" ? "Review repository activity" : "Validate deployment health",
      detail: eventUrl(event) || undefined,
      source: event.source,
      priority: "medium",
      status: "todo",
      ownerRole: event.source === "github" ? "Engineering Lead" : "Platform Operator",
      evidence: eventUrl(event) ? [eventUrl(event) as string] : [],
    })),
    roles: [
      {
        name: "Engineering Lead",
        focus: "Triage code and release activity",
        responsibilities: ["Review commit and PR signal", "Define next technical action for delivery"],
        nextActions: ["Classify top issue and assign owner"],
      },
      {
        name: "Platform Operator",
        focus: "Monitor deployment reliability",
        responsibilities: ["Confirm latest deployment status", "Escalate failed or stale deploys"],
        nextActions: ["Verify production endpoint health"],
      },
    ],
  }
}

function buildAIMessage(
  client: { id: string; name: string },
  matched: PulseEvent[],
  githubRepos: string[],
  deployHosts: string[]
): string {
  const compactEvents = matched.slice(0, 40).map((e) => ({
    source: e.source,
    timestamp: e.timestamp,
    project: e.project,
    data: e.data ?? {},
  }))

  return [
    `Client ID: ${client.id}`,
    `Client Name: ${client.name}`,
    `GitHub Repos: ${githubRepos.join(", ") || "none"}`,
    `Deploy Hosts: ${deployHosts.join(", ") || "none"}`,
    `Matched Events JSON: ${JSON.stringify(compactEvents)}`,
    "Create BEAM-role-aligned work planning output.",
  ].join("\n")
}

async function generatePulseReportWithAI(
  client: { id: string; name: string },
  matched: PulseEvent[],
  githubRepos: string[],
  deployHosts: string[]
): Promise<PulseReport> {
  const fallback = fallbackPulseReport(client, matched, githubRepos, deployHosts)
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey || matched.length === 0) return fallback

  try {
    const openai = new OpenAI({ apiKey: openaiKey })
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return JSON only. Use this exact top-level shape: { snapshot, workItems, roles }. " +
            "snapshot must include clientId, clientName, generatedAt, matchedEventCount, matchedGithubEventCount, matchedVercelEventCount, githubRepos, deployHosts. " +
            "workItems is an array of objects: title, detail?, source(github|vercel|mixed), priority(high|medium|low), status(todo|in_progress|blocked|done), ownerRole?, evidence(string[]), dueDate?. " +
            "roles is an array of objects: name, focus, responsibilities(string[]), nextActions(string[]).",
        },
        {
          role: "user",
          content: buildAIMessage(client, matched, githubRepos, deployHosts),
        },
      ],
    })

    const rawText = completion.choices[0]?.message?.content ?? ""
    const parsedJson = JSON.parse(rawText)
    const parsed = pulseReportSchema.safeParse(parsedJson)

    if (parsed.success) {
      return parsed.data
    }

    return {
      ...fallback,
      parseError: parsed.error.issues.map((issue) => issue.message).join("; "),
      rawText,
    }
  } catch (error) {
    return {
      ...fallback,
      parseError: error instanceof Error ? error.message : "AI parse/generation failed",
    }
  }
}

async function persistPulseReport(clientId: string, pulseReport: PulseReport, summary: string): Promise<void> {
  try {
    const db = getFirestoreDb()
    if (!db) return
    await db.collection("clients").doc(clientId).update({
      pulseReport,
      pulseSummary: summary,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.warn("Failed to persist pulse report:", error)
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const client = await getClientDirectoryEntryById(id)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const githubRepos = collectClientGithubRepos(client)
    const deployHosts = collectClientDeployHosts(client)

    if (githubRepos.length === 0 && deployHosts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Set githubRepos/deployHosts (or legacy githubRepo/deployUrl) on this client first",
        },
        { status: 400 }
      )
    }

    const [githubEvents, vercelEvents] = await Promise.all([
      fetchPulseEvents(req.nextUrl.origin, buildPulsePath("/api/pulse/github", "repo", githubRepos)),
      fetchPulseEvents(req.nextUrl.origin, buildPulsePath("/api/pulse/vercel", "host", deployHosts)),
    ])

    const repoSet = new Set(githubRepos)
    const hostSet = new Set(deployHosts)

    const matched = [...githubEvents, ...vercelEvents]
      .filter((event) => matchesClient(event, hostSet, repoSet))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const pulseReport = await generatePulseReportWithAI(
      { id: client.id, name: client.name },
      matched,
      githubRepos,
      deployHosts
    )

    const validatedReport = pulseReportSchema.parse(pulseReport)
    const humanReadable = summarizePulseReport(validatedReport)

    await persistPulseReport(client.id, validatedReport, [humanReadable.summary, ...humanReadable.suggestions.map((s) => `- ${s}`)].join("\n"))

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        deployUrl: client.deployUrl ?? null,
        githubRepo: client.githubRepo ?? null,
        githubRepos,
        deployHosts,
      },
      pulseReport: validatedReport,
      summary: humanReadable.summary,
      suggestions: humanReadable.suggestions,
      matchedEventCount: matched.length,
      matchedEvents: matched.slice(0, 50),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate pulse suggestions",
      },
      { status: 500 }
    )
  }
}
