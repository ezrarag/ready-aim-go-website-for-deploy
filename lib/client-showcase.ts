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

/** Minimal, public-safe client shape sent to the /work page. */
export interface PublicShowcaseClient {
  id: string
  name: string
  tagline: string | null
  siteUrl: string
  products: ModuleKey[]
  storyId: string | null
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

/**
 * Project the full directory down to public-safe showcase entries: only
 * clients with a public site that are not explicitly hidden, sorted by name.
 */
export function toShowcaseClients(entries: ClientDirectoryEntry[]): PublicShowcaseClient[] {
  return entries
    .filter((entry) => {
      if (entry.showOnFrontend === false) return false
      if (!isVisible(entry.publicProfile, "roster")) return false
      return Boolean(resolvePublicSiteUrl(entry))
    })
    .map((entry) => ({
      id: entry.id,
      name: resolveDisplayName(entry.name, entry.publicProfile),
      tagline:
        entry.publicProfile?.identity?.tagline ||
        entry.publicProfile?.taxonomy?.industry ||
        null,
      siteUrl: resolvePublicSiteUrl(entry) as string,
      products: getProductsInUse(entry),
      storyId: entry.storyId ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
