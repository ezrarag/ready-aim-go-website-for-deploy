/**
 * Portal authentication helpers.
 *
 * Portal routes are client-scoped. Every request must carry a valid Firebase
 * ID token in the Authorization header (Bearer <token>). The token is
 * verified with Firebase Admin Auth and the uid is used to resolve the full
 * ClientRelationshipContract from Firestore.
 *
 * Resolution order:
 *  1. users/{uid}.memberships  — new multi-client contract
 *  2. users/{uid}.client_id    — legacy single-client back-fill
 *  3. ragAllowlist/{emailDocId} — pre-account-setup lookup (clientIds/memberships or legacy clientId)
 *  4. clients.portalUid == uid — final legacy fallback
 *
 * If no clientId can be resolved the helpers return null and the route
 * must respond 401.
 */

import { type NextRequest } from "next/server"
import { getFirebaseAdminAuth } from "@/lib/firestore"
import {
  contractFromUserDoc,
  buildOwnerMembership,
  type ClientMembership,
  type UserRole,
} from "@/lib/types/client-membership"
import { emailToDocId } from "@/lib/beam-access-shared"

export type PortalIdentity = {
  uid: string
  /** Primary / currently active clientId for the session. */
  activeClientId: string
  /** All clientIds this user may access. */
  clientIds: string[]
  /** Canonical role for the activeClientId. */
  userRole: UserRole
  /** Full per-client membership map. */
  memberships: Record<string, ClientMembership>
}

/**
 * Verify the Bearer token and resolve the full portal identity.
 * Returns null when auth fails or no clientId can be resolved — caller must return 401.
 */
export async function resolvePortalIdentity(
  request: NextRequest
): Promise<PortalIdentity | null> {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null

  const idToken = header.slice(7).trim()
  if (!idToken) return null

  try {
    const auth = getFirebaseAdminAuth()
    if (!auth) return null

    const decoded = await auth.verifyIdToken(idToken)
    const uid = decoded.uid
    const email =
      typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : ""

    const { getFirestoreDb } = await import("@/lib/firestore")
    const db = getFirestoreDb()
    if (!db) return null

    // ── Path 1 & 2: users/{uid} — memberships map or legacy client_id ────────
    const userDoc = await db.collection("users").doc(uid).get()
    if (userDoc.exists) {
      const data = userDoc.data() as Record<string, unknown>
      const contract = contractFromUserDoc(data)
      if (contract && contract.activeClientId) {
        // ── Revocation gate: check ragAllowlist.active even for promoted users ─
        // An admin setting active=false must revoke access regardless of which
        // resolution path was taken.
        if (email) {
          const allowlistDocId = emailToDocId(email)
          const allowlistDoc = await db.collection("ragAllowlist").doc(allowlistDocId).get()
          if (allowlistDoc.exists) {
            const aData = allowlistDoc.data() as Record<string, unknown>
            // Explicitly revoked — deny access immediately.
            if (aData.active === false) return null
          }
        }
        return {
          uid,
          activeClientId: contract.activeClientId,
          clientIds: contract.clientIds,
          userRole: contract.userRole,
          memberships: contract.memberships,
        }
      }
    }

    // ── Path 3: ragAllowlist lookup by email ─────────────────────────────────
    if (email) {
      const allowlistDocId = emailToDocId(email)
      const allowlistDoc = await db.collection("ragAllowlist").doc(allowlistDocId).get()

      if (allowlistDoc.exists) {
        const aData = allowlistDoc.data() as Record<string, unknown>
        // active field defaults to true when absent (older entries)
        const active = aData.active !== false

        if (active) {
          // New contract: clientIds + memberships written at provision time
          const clientIdsFromAllowlist = Array.isArray(aData.clientIds)
            ? (aData.clientIds as unknown[]).filter((v): v is string => typeof v === "string")
            : null
          const membershipsFromAllowlist =
            aData.memberships &&
            typeof aData.memberships === "object" &&
            !Array.isArray(aData.memberships)
              ? (aData.memberships as Record<string, ClientMembership>)
              : null

          if (
            clientIdsFromAllowlist &&
            clientIdsFromAllowlist.length > 0 &&
            membershipsFromAllowlist
          ) {
            const activeClientId = clientIdsFromAllowlist[0]
            const userRole = membershipsFromAllowlist[activeClientId]?.role ?? "owner"
            return {
              uid,
              activeClientId,
              clientIds: clientIdsFromAllowlist,
              userRole,
              memberships: membershipsFromAllowlist,
            }
          }

          // Legacy allowlist: single clientId field
          const legacyClientId =
            typeof aData.clientId === "string" && aData.clientId.trim()
              ? aData.clientId.trim()
              : null

          if (legacyClientId) {
            const memberships = buildOwnerMembership(legacyClientId)
            return {
              uid,
              activeClientId: legacyClientId,
              clientIds: [legacyClientId],
              userRole: "owner",
              memberships,
            }
          }
        }
      }
    }

    // ── Path 4: clients collection — portalUid field ─────────────────────────
    const clientsSnap = await db
      .collection("clients")
      .where("portalUid", "==", uid)
      .limit(1)
      .get()

    if (!clientsSnap.empty) {
      const clientId = clientsSnap.docs[0].id
      const memberships = buildOwnerMembership(clientId)
      return {
        uid,
        activeClientId: clientId,
        clientIds: [clientId],
        userRole: "owner",
        memberships,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check whether the identity is allowed to access the given resourceClientId.
 * Multi-client aware: checks the full clientIds array.
 */
export function isClientAllowed(
  identity: PortalIdentity,
  resourceClientId: string
): boolean {
  return identity.clientIds.includes(resourceClientId)
}

/**
 * @deprecated Use isClientAllowed instead.
 * Kept for backward compatibility — delegates to isClientAllowed.
 */
export function isClientMatch(
  identity: PortalIdentity,
  resourceClientId: string
): boolean {
  return isClientAllowed(identity, resourceClientId)
}
