import { z } from "zod"

export const clientWorkContextSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  summary: z.string().min(1),
  sources: z.array(z.string()).default([]),
  status: z.enum(["suggested", "confirmed"]).default("suggested"),
})

export const clientRoleSuggestionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  workstream: z.string().min(1),
  summary: z.string().min(1),
  rationale: z.string().min(1),
  sourceContexts: z.array(z.string()).default([]),
  status: z.enum(["suggested", "shortlisted", "approved", "rejected"]).default("suggested"),
})

export const clientRoleSuggestionSnapshotSchema = z.object({
  generatedAt: z.string().min(1),
  businessType: z.string().optional(),
  summary: z.string().optional(),
  workContexts: z.array(clientWorkContextSchema).default([]),
  roleSuggestions: z.array(clientRoleSuggestionSchema).default([]),
})

export type ClientWorkContext = z.infer<typeof clientWorkContextSchema>
export type ClientRoleSuggestion = z.infer<typeof clientRoleSuggestionSchema>
export type ClientRoleSuggestionSnapshot = z.infer<typeof clientRoleSuggestionSnapshotSchema>

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function normalizeRoleSuggestionSnapshot(
  snapshot: Omit<ClientRoleSuggestionSnapshot, "workContexts" | "roleSuggestions"> & {
    workContexts: Array<Omit<ClientWorkContext, "id"> & { id?: string }>
    roleSuggestions: Array<Omit<ClientRoleSuggestion, "id"> & { id?: string }>
  }
): ClientRoleSuggestionSnapshot {
  return clientRoleSuggestionSnapshotSchema.parse({
    ...snapshot,
    workContexts: snapshot.workContexts.map((context, index) => ({
      ...context,
      id: context.id || `${slugify(context.label) || "context"}-${index + 1}`,
    })),
    roleSuggestions: snapshot.roleSuggestions.map((suggestion, index) => ({
      ...suggestion,
      id: suggestion.id || `${slugify(suggestion.title) || "role"}-${index + 1}`,
    })),
  })
}
