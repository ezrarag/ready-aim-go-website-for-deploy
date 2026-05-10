/**
 * lib/types/client-public-profile.ts
 *
 * Public-facing profile contract stored under clients/{clientId}.publicProfile.
 *
 * Read by: hero, story-overlay, story-area-detail, /story/[storyId]/[category].
 * Written by: admin PATCH /api/clients/[id], future portal profile settings.
 *
 * Backward-compat guarantee: every field is optional. isVisible() defaults to
 * true when publicProfile or its visibility map is absent, so older clients
 * without a publicProfile still render normally.
 */

// ---------------------------------------------------------------------------
// Visibility toggles
// ---------------------------------------------------------------------------

/**
 * Per-section visibility toggles. Any key absent or set to true = visible.
 * Set a key to false to mute that section from all public surfaces.
 */
export interface PublicVisibility {
  story: boolean        // Hero background video + story overlay
  roster: boolean       // Roster overlay card
  projects: boolean     // publicProjects list on story page
  files: boolean        // File/asset links on story page
  services: boolean     // Service cards on story page
  products: boolean     // Product / marketplace cards on story page
  pricing: boolean      // Pricing tiers on story page
  people: boolean       // Team bios on story page
  fleet: boolean        // Transportation / fleet section
  properties: boolean   // Real estate / housing section
  benefits: boolean     // Benefits / partner perks section
  partners: boolean     // Partner logos / acknowledgements
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** Brand identity shown on all public-facing surfaces. */
export interface PublicIdentity {
  /** Override display name (falls back to client.name). */
  displayName?: string
  /** One-liner shown on story overlay cards, hero, and meta tags. */
  tagline?: string
  /** Longer bio paragraph(s) for the story detail page. */
  bio?: string
  logoUrl?: string
  coverImageUrl?: string
  /** Year founded, e.g. "2021". */
  founded?: string
  /** City / region label. */
  location?: string
  /** Override the website CTA label, e.g. "Visit our site". */
  websiteLabel?: string
}

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

/**
 * Categorises the client on public surfaces.
 * Lets transportation, BEAM, real-estate, and service clients be
 * represented through structured fields rather than free-form copy.
 */
export interface PublicTaxonomy {
  /** Primary industry label, e.g. "Transportation", "Real Estate", "Technology". */
  industry?: string
  /** Short service area labels shown as pills, e.g. ["Fleet management", "Logistics"]. */
  services?: string[]
  /** More granular specialties. */
  specialties?: string[]
  /** Geographic regions served. */
  regions?: string[]
  /** Classifies the account type for display and filtering. */
  participantType?: "beam" | "operator" | "partner" | "client"
}

// ---------------------------------------------------------------------------
// Content sections
// ---------------------------------------------------------------------------

/** A featured project card shown on the public story page. */
export interface PublicProject {
  id: string
  title: string
  summary: string
  coverImageUrl?: string
  liveUrl?: string
  /** Maps to a ModuleKey area for deep-linking, e.g. "web", "app". */
  category?: string
  completedAt?: string   // ISO-8601
  tags?: string[]
}

/** A service offered by the client (not RAG platform pricing). */
export interface PublicService {
  id: string
  title: string
  description: string
  /** Lucide icon name for the frontend to look up, e.g. "Truck". */
  iconKey?: string
  /** Human-readable price hint, e.g. "Starting at $500". Not a machine value. */
  priceHint?: string
  /** ModuleKey category this service maps to, for filtering per story area. */
  category?: string
  available: boolean
}

/** A product / marketplace card. */
export interface PublicProduct {
  id: string
  title: string
  description: string
  imageUrl?: string
  /** Display price in USD cents. */
  price?: number
  currency?: string    // default "usd"
  available: boolean
  purchaseUrl?: string
}

/**
 * One pricing tier for client-offered services.
 * This is distinct from RAG platform subscription tiers (/pricing).
 */
export interface PublicPricingTier {
  id: string
  name: string
  /** Monthly price in USD cents. Omit for "custom / contact us" tiers. */
  priceMonthly?: number
  /** Annual price in USD cents. */
  priceAnnual?: number
  description: string
  features: string[]
  /** Highlight as "most popular". */
  highlight?: boolean
  ctaLabel?: string
  ctaUrl?: string
}

/** A team member bio entry shown on the public story page. */
export interface PublicPerson {
  id: string
  name: string
  role: string
  bio?: string
  avatarUrl?: string
  linkedinUrl?: string
}

// ---------------------------------------------------------------------------
// Growth indicators
// ---------------------------------------------------------------------------

/**
 * Operational growth stats surfaced as a highlight bar on the story page.
 * All fields optional; omit any that are not applicable.
 */
export interface PublicGrowth {
  projectsCompleted?: number
  activeProjects?: number
  /** ISO-8601 date — when the client joined the RAG platform. */
  platformTenureStart?: string
  /** Number of active fleet vehicles / units. */
  activeFleetSize?: number
  /** Number of properties currently managed. */
  propertiesManaged?: number
  /** Total published story / build updates. */
  updatesPublished?: number
  /** BEAM participants currently supported by this client. */
  beamParticipantsSupported?: number
}

// ---------------------------------------------------------------------------
// Root contract
// ---------------------------------------------------------------------------

/**
 * Full public-facing profile embedded in clients/{clientId}.publicProfile.
 * Every top-level key is optional for backward compatibility.
 */
export interface ClientPublicProfile {
  visibility?: Partial<PublicVisibility>
  identity?: PublicIdentity
  taxonomy?: PublicTaxonomy
  publicProjects?: PublicProject[]
  services?: PublicService[]
  products?: PublicProduct[]
  pricing?: PublicPricingTier[]
  people?: PublicPerson[]
  growth?: PublicGrowth
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the section should render on public surfaces.
 * Defaults to true when publicProfile or its visibility map is absent
 * (backward-compat: older clients have no publicProfile).
 */
export function isVisible(
  publicProfile: ClientPublicProfile | undefined | null,
  key: keyof PublicVisibility
): boolean {
  if (!publicProfile?.visibility) return true
  return publicProfile.visibility[key] !== false
}

/**
 * Resolve the display name, preferring publicProfile.identity.displayName
 * over the legacy client.name field.
 */
export function resolveDisplayName(
  clientName: string,
  publicProfile: ClientPublicProfile | undefined | null
): string {
  return publicProfile?.identity?.displayName?.trim() || clientName
}

/**
 * Format a USD-cent integer as a human-readable price string.
 * e.g. 50000 → "$500" | 0 → "Free"
 */
export function formatCentPrice(cents: number | undefined): string {
  if (cents === undefined) return "Contact us"
  if (cents === 0) return "Free"
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

/**
 * Compute how long a client has been on the platform from platformTenureStart.
 * Returns a string like "3 years" or "8 months".
 */
export function computePlatformTenure(isoStart: string | undefined): string | null {
  if (!isoStart) return null
  try {
    const start = new Date(isoStart)
    if (!Number.isFinite(start.getTime())) return null
    const months = Math.max(
      0,
      (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
    if (months >= 12) {
      const years = Math.floor(months / 12)
      return `${years} year${years !== 1 ? "s" : ""}`
    }
    const m = Math.round(months)
    return `${m} month${m !== 1 ? "s" : ""}`
  } catch {
    return null
  }
}
