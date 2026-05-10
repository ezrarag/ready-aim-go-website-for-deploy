import { z } from "zod"

export const clientWorkspacePhaseSchema = z.enum([
  "discovery",
  "planning",
  "building",
  "launching",
  "support",
])

export const clientWorkspaceHealthSchema = z.enum([
  "on_track",
  "watch",
  "blocked",
])

export const clientWorkspaceNoteKindSchema = z.enum([
  "general",
  "decision",
  "meeting",
  "pulse",
])

export const clientWorkspaceActionStatusSchema = z.enum([
  // Legacy workspace action statuses (kept for backward compat)
  "todo",
  "in_progress",
  "blocked",
  "done",
  // Task lifecycle statuses used by projectTasks and intelligence promote-tasks
  "proposed",
  "accepted",
  "declined",
])

export const clientWorkspacePrioritySchema = z.enum([
  "high",
  "medium",
  "low",
])

export const clientWorkspaceCanvasKindSchema = z.enum([
  "objective",
  "status",
  "scope",
  "risks",
  "next_steps",
  "custom",
])

export const clientWorkspaceNoteSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  body: z.string().default(""),
  kind: clientWorkspaceNoteKindSchema.default("general"),
  pinned: z.boolean().default(false),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const clientWorkspaceActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  detail: z.string().optional(),
  status: clientWorkspaceActionStatusSchema.default("todo"),
  priority: clientWorkspacePrioritySchema.default("medium"),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
  source: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const clientWorkspaceCanvasBlockSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  content: z.string().default(""),
  kind: clientWorkspaceCanvasKindSchema.default("custom"),
})

export const clientWorkspaceSchema = z.object({
  phase: clientWorkspacePhaseSchema.default("planning"),
  health: clientWorkspaceHealthSchema.default("on_track"),
  currentFocus: z.string().default(""),
  summary: z.string().default(""),
  notes: z.array(clientWorkspaceNoteSchema).default([]),
  actions: z.array(clientWorkspaceActionSchema).default([]),
  canvas: z.array(clientWorkspaceCanvasBlockSchema).default([]),
  updatedAt: z.string().min(1),
})

export type ClientWorkspace = z.infer<typeof clientWorkspaceSchema>
export type ClientWorkspaceNote = z.infer<typeof clientWorkspaceNoteSchema>
export type ClientWorkspaceAction = z.infer<typeof clientWorkspaceActionSchema>
export type ClientWorkspaceCanvasBlock = z.infer<typeof clientWorkspaceCanvasBlockSchema>
export type ClientWorkspacePhase = z.infer<typeof clientWorkspacePhaseSchema>
export type ClientWorkspaceHealth = z.infer<typeof clientWorkspaceHealthSchema>
export type ClientWorkspaceActionStatus = z.infer<typeof clientWorkspaceActionStatusSchema>
export type ClientWorkspacePriority = z.infer<typeof clientWorkspacePrioritySchema>
export type ClientWorkspaceNoteKind = z.infer<typeof clientWorkspaceNoteKindSchema>
export type ClientWorkspaceCanvasKind = z.infer<typeof clientWorkspaceCanvasKindSchema>

export type ClientWorkspaceSeed = {
  id: string
  name: string
  storyId: string
  status?: string
  deployStatus?: string
  websiteUrl?: string
  deployUrl?: string
  githubRepos?: string[]
  deployHosts?: string[]
  pulseSummary?: string
  pulseReport?: {
    workItems?: Array<{ title?: string }>
  }
  roleSuggestionSnapshot?: {
    roleSuggestions?: Array<{ title?: string; status?: string }>
  }
}

function buildWorkspaceId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`
}

function firstMeaningfulPulseLine(summary?: string): string {
  if (!summary) return ""

  const lines = summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.find((line) => !line.startsWith("-")) || lines[0] || ""
}

function derivePhase(seed: ClientWorkspaceSeed): ClientWorkspacePhase {
  if (seed.deployStatus === "live") return "support"
  if (seed.deployStatus === "building") return "building"
  if (seed.status === "onboarding") return "discovery"
  return "planning"
}

function deriveHealth(seed: ClientWorkspaceSeed): ClientWorkspaceHealth {
  if (seed.deployStatus === "error") return "blocked"
  if (!seed.pulseSummary && (!seed.githubRepos || seed.githubRepos.length === 0)) return "watch"
  return "on_track"
}

function buildDefaultCanvas(seed: ClientWorkspaceSeed): ClientWorkspaceCanvasBlock[] {
  const repoLine =
    Array.isArray(seed.githubRepos) && seed.githubRepos.length > 0
      ? seed.githubRepos.join(", ")
      : "No GitHub repos linked yet."
  const hostLine =
    Array.isArray(seed.deployHosts) && seed.deployHosts.length > 0
      ? seed.deployHosts.join(", ")
      : seed.deployUrl || "No deploy hosts linked yet."
  const suggestedRoles =
    seed.roleSuggestionSnapshot?.roleSuggestions
      ?.filter((role) => role.status !== "rejected")
      .slice(0, 3)
      .map((role) => role.title)
      .filter((title): title is string => Boolean(title))
      .join(", ") || "No draft roles generated yet."

  return [
    {
      id: buildWorkspaceId("canvas-objective", 0),
      title: "Client Brief",
      kind: "objective",
      content: [
        `Client: ${seed.name}`,
        `Story ID: ${seed.storyId}`,
        `Status: ${seed.status || "unknown"}`,
        `Website: ${seed.websiteUrl || seed.deployUrl || "Not set"}`,
      ].join("\n"),
    },
    {
      id: buildWorkspaceId("canvas-status", 1),
      title: "Development Snapshot",
      kind: "status",
      content: [
        `Deploy status: ${seed.deployStatus || "unknown"}`,
        `Repos: ${repoLine}`,
        `Hosts: ${hostLine}`,
      ].join("\n"),
    },
    {
      id: buildWorkspaceId("canvas-scope", 2),
      title: "Working Scope",
      kind: "scope",
      content: [
        firstMeaningfulPulseLine(seed.pulseSummary) || "Capture the current scope of work here.",
        "",
        `Suggested roles: ${suggestedRoles}`,
      ].join("\n"),
    },
    {
      id: buildWorkspaceId("canvas-next", 3),
      title: "Next Steps",
      kind: "next_steps",
      content: [
        "- Clarify current delivery focus",
        "- Capture blockers, dependencies, and deadlines",
        "- Add actions that Pulse should watch",
      ].join("\n"),
    },
  ]
}

function buildDefaultActions(seed: ClientWorkspaceSeed, now: string): ClientWorkspaceAction[] {
  const pulseWorkItems = seed.pulseReport?.workItems ?? []
  if (pulseWorkItems.length === 0) return []

  return pulseWorkItems.slice(0, 3).map((item, index) => ({
    id: buildWorkspaceId("action", index),
    title: item.title || "Review pulse work item",
    detail: "Seeded from the latest Pulse summary.",
    status: "todo",
    priority: "medium",
    source: "pulse",
    createdAt: now,
    updatedAt: now,
  }))
}

export function buildDefaultClientWorkspace(seed: ClientWorkspaceSeed): ClientWorkspace {
  const now = new Date().toISOString()

  return {
    phase: derivePhase(seed),
    health: deriveHealth(seed),
    currentFocus:
      firstMeaningfulPulseLine(seed.pulseSummary) ||
      `Define the current working focus for ${seed.name}.`,
    summary: seed.pulseSummary || "",
    notes: [],
    actions: buildDefaultActions(seed, now),
    canvas: buildDefaultCanvas(seed),
    updatedAt: now,
  }
}

export function normalizeClientWorkspace(
  input: unknown,
  seed: ClientWorkspaceSeed
): ClientWorkspace {
  const fallback = buildDefaultClientWorkspace(seed)
  const parsed = clientWorkspaceSchema.safeParse(input)
  if (!parsed.success) {
    return fallback
  }

  return {
    ...fallback,
    ...parsed.data,
    notes: parsed.data.notes,
    actions: parsed.data.actions,
    canvas: parsed.data.canvas,
  }
}
