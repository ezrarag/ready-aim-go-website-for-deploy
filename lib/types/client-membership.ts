/**
 * lib/types/client-membership.ts
 *
 * Canonical client relationship contract.
 *
 * Stored as users/{uid}.memberships / users/{uid}.clientIds.
 * Also mirrored onto ragAllowlist/{emailDocId} at provision time so the
 * portal-auth resolver can build the full contract even before the user
 * completes the /api/client-account setup flow.
 *
 * Backward-compat guarantees:
 *  - users/{uid}.role        — still written, still the authoritative admin flag
 *  - users/{uid}.client_id   — still written for legacy single-client hooks
 *  - ragAllowlist.clientId   — still written by provision-client-portal.ts
 */

/** Role a user holds for a specific client engagement. */
export type UserRole = "owner" | "collaborator" | "admin"

/** Lifecycle status of a membership entry. */
export type MembershipStatus = "active" | "suspended" | "pending"

/**
 * Per-client membership record stored under users/{uid}.memberships[clientId].
 */
export interface ClientMembership {
  role: UserRole
  status: MembershipStatus
  createdAt: string   // ISO-8601
  updatedAt: string   // ISO-8601
}

/**
 * The full client relationship contract.
 * Computed at auth resolution time from users/{uid} + fallback lookups.
 */
export interface ClientRelationshipContract {
  /** Primary role, derived from the activeClientId membership. */
  userRole: UserRole
  /** Every clientId this user may access. */
  clientIds: string[]
  /** Primary / currently active clientId for this session. */
  activeClientId: string | null
  /** Full membership map — keyed by clientId. */
  memberships: Record<string, ClientMembership>
}

// ---------------------------------------------------------------------------
// Helper constructors
// ---------------------------------------------------------------------------

const NOW = () => new Date().toISOString()

/**
 * Build a single-client "owner" membership — used when onboarding legacy
 * single-client users or when creating the initial entry at provision time.
 */
export function buildOwnerMembership(
  clientId: string,
  overrides?: Partial<ClientMembership>
): Record<string, ClientMembership> {
  return {
    [clientId]: {
      role: "owner",
      status: "active",
      createdAt: overrides?.createdAt ?? NOW(),
      updatedAt: NOW(),
      ...overrides,
    },
  }
}

/**
 * Derive a ClientRelationshipContract from raw Firestore users/{uid} data.
 * Returns null if the data does not contain enough to resolve a clientId.
 *
 * Resolution order:
 *  1. users/{uid}.memberships  (new contract)
 *  2. users/{uid}.client_id    (legacy single-client)
 */
export function contractFromUserDoc(
  data: Record<string, unknown>,
  preferredClientId?: string | null
): ClientRelationshipContract | null {
  const rawMemberships =
    data.memberships && typeof data.memberships === "object" && !Array.isArray(data.memberships)
      ? (data.memberships as Record<string, unknown>)
      : null

  const rawClientIds = Array.isArray(data.clientIds)
    ? (data.clientIds as unknown[]).filter((v): v is string => typeof v === "string")
    : null

  // ── Path 1: new memberships map ──────────────────────────────────────────
  if (rawMemberships && Object.keys(rawMemberships).length > 0) {
    const memberships: Record<string, ClientMembership> = {}
    for (const [cid, raw] of Object.entries(rawMemberships)) {
      if (!raw || typeof raw !== "object") continue
      const m = raw as Record<string, unknown>
      memberships[cid] = {
        role: isUserRole(m.role) ? m.role : "collaborator",
        status: isMembershipStatus(m.status) ? m.status : "active",
        createdAt: typeof m.createdAt === "string" ? m.createdAt : NOW(),
        updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : NOW(),
      }
    }

    const clientIds = rawClientIds ?? Object.keys(memberships)
    const activeClientId = pickActiveClientId(clientIds, preferredClientId)

    return {
      clientIds,
      memberships,
      activeClientId,
      userRole: activeClientId
        ? (memberships[activeClientId]?.role ?? "collaborator")
        : "collaborator",
    }
  }

  // ── Path 2: legacy client_id ─────────────────────────────────────────────
  const legacyClientId =
    typeof data.client_id === "string" && data.client_id.trim()
      ? data.client_id.trim()
      : null

  if (legacyClientId) {
    const memberships = buildOwnerMembership(legacyClientId)
    const clientIds = [legacyClientId]
    const activeClientId = pickActiveClientId(clientIds, preferredClientId)

    return {
      clientIds,
      memberships,
      activeClientId,
      userRole: "owner",
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Internal guards
// ---------------------------------------------------------------------------

function isUserRole(v: unknown): v is UserRole {
  return v === "owner" || v === "collaborator" || v === "admin"
}

function isMembershipStatus(v: unknown): v is MembershipStatus {
  return v === "active" || v === "suspended" || v === "pending"
}

function pickActiveClientId(
  clientIds: string[],
  preferred?: string | null
): string | null {
  if (!clientIds.length) return null
  if (preferred && clientIds.includes(preferred)) return preferred
  return clientIds[0]
}
