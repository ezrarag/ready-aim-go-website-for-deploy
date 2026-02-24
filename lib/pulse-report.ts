import { z } from "zod"

export const pulsePrioritySchema = z.enum(["high", "medium", "low"])
export const pulseStatusSchema = z.enum(["todo", "in_progress", "blocked", "done"])

export const pulseWorkItemSchema = z.object({
  title: z.string().min(1),
  detail: z.string().optional(),
  source: z.enum(["github", "vercel", "mixed"]),
  priority: pulsePrioritySchema,
  status: pulseStatusSchema,
  ownerRole: z.string().optional(),
  evidence: z.array(z.string()).default([]),
  dueDate: z.string().optional(),
})

export const pulseRoleSchema = z.object({
  name: z.string().min(1),
  focus: z.string().min(1),
  responsibilities: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
})

export const pulseSnapshotSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  generatedAt: z.string().min(1),
  matchedEventCount: z.number().int().nonnegative(),
  matchedGithubEventCount: z.number().int().nonnegative(),
  matchedVercelEventCount: z.number().int().nonnegative(),
  githubRepos: z.array(z.string()).default([]),
  deployHosts: z.array(z.string()).default([]),
})

export const pulseReportSchema = z.object({
  snapshot: pulseSnapshotSchema,
  workItems: z.array(pulseWorkItemSchema).default([]),
  roles: z.array(pulseRoleSchema).default([]),
  parseError: z.string().optional(),
  rawText: z.string().optional(),
})

export type PulseReport = z.infer<typeof pulseReportSchema>

export function summarizePulseReport(report: PulseReport): { summary: string; suggestions: string[] } {
  const highPriority = report.workItems.filter((w) => w.priority === "high")
  const summary =
    highPriority.length > 0
      ? `${report.snapshot.clientName}: ${highPriority.length} high-priority work item(s) across ${report.snapshot.matchedEventCount} matched Pulse event(s).`
      : `${report.snapshot.clientName}: ${report.snapshot.matchedEventCount} matched Pulse event(s) analyzed.`

  const suggestions = report.workItems
    .slice(0, 6)
    .map((w) => {
      const rolePart = w.ownerRole ? ` (${w.ownerRole})` : ""
      return `${w.title}${rolePart}`
    })

  if (suggestions.length === 0) {
    suggestions.push("No structured work items generated yet. Trigger a deployment or push a commit and retry.")
  }

  return { summary, suggestions }
}
