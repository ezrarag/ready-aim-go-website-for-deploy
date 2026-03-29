import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import {
  getClientDirectoryEntryById,
  getClientUpdates,
  getFirestoreDb,
} from "@/lib/firestore"
import { fetchAndExtractWebsite } from "@/lib/website-analysis"
import {
  clientRoleSuggestionSnapshotSchema,
  normalizeRoleSuggestionSnapshot,
  type ClientRoleSuggestionSnapshot,
} from "@/lib/client-role-suggestions"
import { collectClientDeployHosts, collectClientGithubRepos } from "@/lib/pulse-selectors"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

function clientLooksBeamRelated(client: {
  name: string
  storyId: string
  brands: string[]
  pulseSummary?: string
}): boolean {
  const text = [client.name, client.storyId, ...client.brands, client.pulseSummary ?? ""].join(" ").toLowerCase()
  return text.includes("beam")
}

function summarizeUpdates(
  updates: Awaited<ReturnType<typeof getClientUpdates>>
): Array<{ title: string; summary?: string; type: string; status: string }> {
  return updates.slice(0, 8).map((update) => ({
    title: update.title,
    summary: update.summary ?? update.body ?? update.details,
    type: update.type,
    status: update.status,
  }))
}

async function maybeRefreshPulse(
  request: NextRequest,
  clientId: string,
  client: Awaited<ReturnType<typeof getClientDirectoryEntryById>>
) {
  if (!client) return { pulseSummary: undefined, pulseReport: undefined }

  if (client.pulseReport || client.pulseSummary) {
    return {
      pulseSummary: client.pulseSummary,
      pulseReport: client.pulseReport,
    }
  }

  const githubRepos = collectClientGithubRepos(client)
  const deployHosts = collectClientDeployHosts(client)
  if (githubRepos.length === 0 && deployHosts.length === 0) {
    return { pulseSummary: undefined, pulseReport: undefined }
  }

  try {
    const response = await fetch(`${request.nextUrl.origin}/api/clients/${encodeURIComponent(clientId)}/pulse-suggestions`, {
      cache: "no-store",
    })
    if (!response.ok) return { pulseSummary: undefined, pulseReport: undefined }
    const payload = await response.json()
    if (!payload?.success) return { pulseSummary: undefined, pulseReport: undefined }
    return {
      pulseSummary: typeof payload.summary === "string" ? payload.summary : undefined,
      pulseReport: payload.pulseReport,
    }
  } catch {
    return { pulseSummary: undefined, pulseReport: undefined }
  }
}

function buildFallbackSnapshot(input: {
  client: NonNullable<Awaited<ReturnType<typeof getClientDirectoryEntryById>>>
  websiteUrl?: string
  websiteExtract?: { title: string; metaDescription: string; h1: string }
  pulseSummary?: string
}): ClientRoleSuggestionSnapshot {
  const beamRelated = clientLooksBeamRelated(input.client)
  const websiteContext = input.websiteUrl
    ? {
        label: "Website Delivery",
        summary: "Client has a web presence or deploy target that needs ongoing build, publishing, and maintenance support.",
        sources: ["website", "client record"],
        status: "suggested" as const,
      }
    : null

  const beamContext = beamRelated
    ? {
        label: "BEAM Participant Support",
        summary: "Client record appears BEAM-related and likely needs participant-facing coordination and delivery support.",
        sources: ["client record", "pulse"],
        status: "suggested" as const,
      }
    : null

  const contexts = [websiteContext, beamContext].filter(Boolean) as Array<{
    label: string
    summary: string
    sources: string[]
    status: "suggested" | "confirmed"
  }>

  const roles = [
    input.websiteUrl
      ? {
          title: "Web Developer",
          category: "Engineering",
          workstream: "Web",
          summary: "Own website implementation, fixes, and deployment readiness.",
          rationale: "Generated from the presence of a mapped website/deploy target and web delivery signals.",
          sourceContexts: ["Website Delivery"],
          status: "suggested" as const,
        }
      : null,
    input.websiteUrl
      ? {
          title: "Client Success Coordinator",
          category: "Operations",
          workstream: "Client Success",
          summary: "Translate client requests into scoped work and keep delivery moving.",
          rationale: "Website delivery usually needs a coordination layer between client communication and implementation.",
          sourceContexts: ["Website Delivery"],
          status: "suggested" as const,
        }
      : null,
    beamRelated
      ? {
          title: "BEAM Program Coordinator",
          category: "Operations",
          workstream: "BEAM",
          summary: "Coordinate participant-facing work, scheduling, and internal follow-through.",
          rationale: "Client signals appear BEAM-related and suggest participant/operations coordination needs.",
          sourceContexts: ["BEAM Participant Support"],
          status: "suggested" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string
    category: string
    workstream: string
    summary: string
    rationale: string
    sourceContexts: string[]
    status: "suggested" | "shortlisted" | "approved" | "rejected"
  }>

  return normalizeRoleSuggestionSnapshot({
    generatedAt: new Date().toISOString(),
    businessType:
      input.websiteExtract?.h1 ||
      input.websiteExtract?.title ||
      (beamRelated ? "BEAM-related organization" : "Client business"),
    summary:
      input.pulseSummary ||
      "Draft work contexts and role suggestions were generated from the current client record and available website signals.",
    workContexts: contexts.length > 0 ? contexts : [
      {
        label: "Client Delivery Support",
        summary: "The client record needs a lightweight operational draft until more website, update, or pulse data is available.",
        sources: ["client record"],
        status: "suggested",
      },
    ],
    roleSuggestions: roles.length > 0 ? roles : [
      {
        title: "Client Operations Lead",
        category: "Operations",
        workstream: "Delivery",
        summary: "Coordinate next steps and clarify staffing needs as more client data comes in.",
        rationale: "Fallback suggestion used when the system has only limited client context available.",
        sourceContexts: ["Client Delivery Support"],
        status: "suggested",
      },
    ],
  })
}

function buildPrompt(input: {
  client: NonNullable<Awaited<ReturnType<typeof getClientDirectoryEntryById>>>
  websiteUrl?: string
  websiteExtract?: { title: string; metaDescription: string; h1: string; text: string }
  updates: Array<{ title: string; summary?: string; type: string; status: string }>
  pulseSummary?: string
  pulseRoles: Array<{ name: string; focus: string }>
}) {
  return [
    `Client Name: ${input.client.name}`,
    `Story ID: ${input.client.storyId}`,
    `Brands: ${input.client.brands.join(", ") || "none"}`,
    `Status: ${input.client.status}`,
    `Website URL: ${input.websiteUrl || "none"}`,
    `Website Extract JSON: ${JSON.stringify(input.websiteExtract ?? null)}`,
    `Client Pulse Summary: ${input.pulseSummary || "none"}`,
    `Pulse Roles JSON: ${JSON.stringify(input.pulseRoles)}`,
    `Recent Updates JSON: ${JSON.stringify(input.updates)}`,
    "Create draft work contexts and draft role suggestions for client/admin review only.",
    "Do not assume any role is final. Favor concise, operationally useful suggestions.",
  ].join("\n")
}

async function generateSnapshotWithAI(input: {
  client: NonNullable<Awaited<ReturnType<typeof getClientDirectoryEntryById>>>
  websiteUrl?: string
  websiteExtract?: { title: string; metaDescription: string; h1: string; text: string }
  updates: Array<{ title: string; summary?: string; type: string; status: string }>
  pulseSummary?: string
  pulseRoles: Array<{ name: string; focus: string }>
}): Promise<ClientRoleSuggestionSnapshot> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackSnapshot(input)
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return JSON only with this exact top-level shape: " +
            "{ generatedAt, businessType, summary, workContexts, roleSuggestions }. " +
            "workContexts is an array of objects: label, summary, sources(string[]), status(suggested|confirmed). " +
            "roleSuggestions is an array of objects: title, category, workstream, summary, rationale, sourceContexts(string[]), status(suggested|shortlisted|approved|rejected). " +
            "Statuses should default to suggested unless there is explicit confirmation in the source material.",
        },
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
      max_tokens: 1400,
    })

    const raw = completion.choices[0]?.message?.content ?? ""
    const parsed = JSON.parse(raw)
    return normalizeRoleSuggestionSnapshot({
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date().toISOString(),
      businessType: typeof parsed.businessType === "string" ? parsed.businessType : undefined,
      summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
      workContexts: Array.isArray(parsed.workContexts) ? parsed.workContexts : [],
      roleSuggestions: Array.isArray(parsed.roleSuggestions) ? parsed.roleSuggestions : [],
    })
  } catch {
    return buildFallbackSnapshot(input)
  }
}

async function persistSnapshot(clientId: string, snapshot: ClientRoleSuggestionSnapshot) {
  const db = getFirestoreDb()
  if (!db) return

  await db.collection("clients").doc(clientId).update({
    roleSuggestionSnapshot: clientRoleSuggestionSnapshotSchema.parse(snapshot),
    updatedAt: new Date().toISOString(),
  })
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const client = await getClientDirectoryEntryById(id)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
      },
      roleSuggestionSnapshot: client.roleSuggestionSnapshot ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load role suggestions",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const client = await getClientDirectoryEntryById(id)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const refreshPulse = body?.refreshPulse !== false

    const websiteUrl = client.websiteUrl || client.deployUrl || undefined
    let websiteExtract: { title: string; metaDescription: string; h1: string; text: string } | undefined
    if (websiteUrl) {
      try {
        websiteExtract = await fetchAndExtractWebsite(websiteUrl)
      } catch (error) {
        console.warn("Role suggestion website analysis skipped:", error)
      }
    }

    const updates = summarizeUpdates(await getClientUpdates(client.id, { limit: 8 }))
    const pulseData = refreshPulse
      ? await maybeRefreshPulse(request, client.id, client)
      : { pulseSummary: client.pulseSummary, pulseReport: client.pulseReport }

    const pulseRoles = Array.isArray(pulseData.pulseReport?.roles)
      ? pulseData.pulseReport.roles.map((role) => ({
          name: role.name,
          focus: role.focus,
        }))
      : []

    const snapshot = await generateSnapshotWithAI({
      client,
      websiteUrl,
      websiteExtract,
      updates,
      pulseSummary: pulseData.pulseSummary ?? client.pulseSummary,
      pulseRoles,
    })

    await persistSnapshot(client.id, snapshot)

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
      },
      roleSuggestionSnapshot: snapshot,
      unifiedInputs: {
        websiteAnalyzed: Boolean(websiteExtract),
        websiteUrl: websiteUrl ?? null,
        pulseIncluded: Boolean((pulseData.pulseSummary ?? client.pulseSummary) || pulseRoles.length > 0),
        updateCount: updates.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate role suggestions",
      },
      { status: 500 }
    )
  }
}
