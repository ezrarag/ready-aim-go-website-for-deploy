/**
 * lib/client-showcase.ts
 *
 * Server-side projection of the client directory into a minimal, public-safe
 * shape for the /work showcase. Strips PII and financials (contactEmail, phone,
 * revenue, commits, …) so the public page only ever receives safe fields over
 * the wire. Consumed by GET /api/clients?public=1 and the /work page.
 */

import type { ClientDirectoryEntry, ModuleKey } from "./client-directory"
import { isVisible, resolveDisplayName } from "./types/client-public-profile"

export const MODULE_LABELS: Record<ModuleKey, string> = {
  web: "Web",
  app: "App",
  rd: "R&D",
  housing: "Housing",
  transportation: "Transportation",
  insurance: "Insurance",
}

const MODULE_URL_FIELDS: Record<ModuleKey, keyof ClientDirectoryEntry> = {
  web: "websiteUrl",
  app: "appUrl",
  rd: "rdUrl",
  housing: "housingUrl",
  transportation: "transportationUrl",
  insurance: "insuranceUrl",
}

const MODULE_ORDER: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]

export type ShowcaseStatus = "live" | "in_build" | "ongoing" | "discovery"

export interface ShowcaseMilestone {
  label: string
  status: "complete" | "in_progress" | "not_started"
}

/** Minimal, public-safe client shape sent to the /work page. */
export interface PublicShowcaseClient {
  id: string
  slug: string
  name: string
  tagline: string | null
  siteUrl: string | null
  previewImageUrl: string | null
  products: ModuleKey[]
  tags: string[]
  storyId: string | null
  status: ShowcaseStatus
  summary: string | null
  problem?: string | null
  whatWeBuilt?: string | null
  milestones?: ShowcaseMilestone[]
  gallery?: string[]
  sector?: string | null
  location?: string | null
}

export interface WorkspaceShowcaseSeed {
  id: string
  name: string
  clientId: string | null
  publicUrl: string | null
  previewImageUrl: string | null
  showOnFrontend: boolean
  frontEndProducts: ModuleKey[]
  frontEndTags: string[]
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Resolve the best PUBLIC site URL. Prefer a real website / custom domain over
 * the immutable *.vercel.app deployment URL, which is protected by Vercel
 * Deployment Protection and would screenshot the "Log in to Vercel" wall.
 */
export function resolvePublicSiteUrl(entry: ClientDirectoryEntry): string | null {
  const domains = entry.vercelProjectDomains ?? []
  const customDomain = domains.find((d) => d && !d.endsWith(".vercel.app"))

  const candidates = [entry.websiteUrl, customDomain, ...domains, entry.deployUrl]
  const raw = candidates.find((value) => Boolean(value && value.trim()))
  if (!raw) return null

  const trimmed = raw.trim()
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** ReadyAimGo products a client is actively utilizing (enabled modules). */
export function getProductsInUse(entry: ClientDirectoryEntry): ModuleKey[] {
  return MODULE_ORDER.filter((key) => {
    const module = entry.modules?.[key]
    if (module) return module.enabled
    // Legacy clients without a modules map: infer from the area URL fields.
    return Boolean(entry[MODULE_URL_FIELDS[key]])
  })
}

export function inferShowcaseStatus(entry: Partial<ClientDirectoryEntry>): ShowcaseStatus {
  if (entry.deployStatus === "building") return "in_build"
  if (entry.status === "onboarding") return "in_build"
  if (entry.status === "inactive") return "discovery"
  if (resolvePublicSiteUrl(entry as ClientDirectoryEntry)) return "live"
  return "ongoing"
}

/**
 * Project the full directory down to public-safe showcase entries: only
 * clients with showOnFrontend enabled, sorted by name.
 */
export function toShowcaseClients(
  entries: ClientDirectoryEntry[],
  workspaces: WorkspaceShowcaseSeed[] = []
): PublicShowcaseClient[] {
  const workspaceByClientId = new Map<string, WorkspaceShowcaseSeed>()
  for (const workspace of workspaces) {
    if (workspace.clientId && !workspaceByClientId.has(workspace.clientId)) {
      workspaceByClientId.set(workspace.clientId, workspace)
    }
  }

  const showcase: PublicShowcaseClient[] = entries
    .filter((entry) => {
      if (entry.showOnFrontend === false) return false
      if (!isVisible(entry.publicProfile, "roster")) return false
      return true
    })
    .map((entry) => {
      const displayName = resolveDisplayName(entry.name, entry.publicProfile)
      return {
        id: entry.id,
        slug: slugify(displayName),
        name: displayName,
        tagline:
          entry.publicProfile?.identity?.tagline ||
          entry.publicProfile?.taxonomy?.industry ||
          null,
        siteUrl: resolvePublicSiteUrl(entry),
        previewImageUrl: workspaceByClientId.get(entry.id)?.previewImageUrl ?? null,
        products: getProductsInUse(entry),
        tags:
          (workspaceByClientId.get(entry.id)?.frontEndTags.length
            ? workspaceByClientId.get(entry.id)?.frontEndTags
            : entry.brands) ?? [],
        storyId: entry.storyId ?? null,
        status: inferShowcaseStatus(entry),
        summary: entry.publicProfile?.identity?.tagline || entry.pulseSummary || null,
        sector: entry.publicProfile?.taxonomy?.industry || null,
        location: entry.publicProfile?.identity?.location || "Milwaukee, WI",
      }
    })

  const byId = new Map<string, PublicShowcaseClient>(showcase.map((entry) => [entry.id, entry]))

  for (const workspace of workspaces) {
    if (workspace.showOnFrontend === false) continue
    const client = workspace.clientId ? entries.find((entry) => entry.id === workspace.clientId) : null

    if (client) {
      const existing = byId.get(client.id)
      if (existing) {
        byId.set(client.id, {
          ...existing,
          siteUrl: existing.siteUrl || workspace.publicUrl,
          previewImageUrl: existing.previewImageUrl || workspace.previewImageUrl,
          tags: workspace.frontEndTags.length > 0 ? workspace.frontEndTags : existing.tags,
        })
      }
      continue
    }

    const name = workspace.name
    byId.set(`workspace:${workspace.id}`, {
      id: `workspace:${workspace.id}`,
      slug: slugify(name),
      name: name,
      tagline: null,
      siteUrl: workspace.publicUrl,
      previewImageUrl: workspace.previewImageUrl,
      products: workspace.frontEndProducts.length > 0 ? workspace.frontEndProducts : ["web"],
      tags: workspace.frontEndTags,
      storyId: null,
      status: workspace.publicUrl ? "live" : "in_build",
      summary: null,
      sector: null,
      location: "Milwaukee, WI",
    })
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
}
