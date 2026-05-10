/**
 * lib/provision-client-portal.ts
 *
 * Single function that atomically provisions full portal access for a client.
 * Writes to BOTH collections in one operation:
 *   1. ragAllowlist/{emailDocId}   — allows the email to log into clients.readyaimgo.biz
 *   2. projects/{clientId}         — creates/updates the project record the portal reads from
 *
 * This is the bridge between the two "islands":
 *   clients collection (RAG admin directory)
 *   ↕ this function
 *   ragAllowlist + projects (portal access layer)
 *
 * Called from:
 *   - POST /api/clients         — auto-provision when email is included at creation
 *   - POST /api/clients/[id]/portal-access — manual admin provisioning from client detail page
 *   - Any future intake/onboarding flow that creates a client record
 */

import { getFirestoreDb } from "@/lib/firestore"
import { emailToDocId, generateSlug } from "@/lib/beam-access-shared"
import { buildOwnerMembership } from "@/lib/types/client-membership"

export type PortalProvisionInput = {
  clientId: string           // Firestore document ID in clients collection
  clientName: string         // Display name
  email: string              // Client's login email
  clientSlug?: string        // URL slug — derived from name if not provided
  deliverables?: string[]    // Initial deliverable list
  sourceNgo?: string         // BEAM NGO scope if applicable
  notes?: string             // Admin notes
  addedBy?: string           // Admin UID or identifier
}

export type PortalProvisionResult = {
  success: true
  clientId: string
  email: string
  clientSlug: string
  allowlistDocId: string
  projectDocId: string
  alreadyExisted: {
    allowlist: boolean
    project: boolean
  }
}

export async function provisionClientPortalAccess(
  input: PortalProvisionInput
): Promise<PortalProvisionResult> {
  const db = getFirestoreDb()
  if (!db) throw new Error("Firebase Admin is not configured")

  const email = input.email.trim().toLowerCase()
  const clientName = input.clientName.trim()
  const clientId = input.clientId.trim().toLowerCase()
  const clientSlug = generateSlug(input.clientSlug?.trim() || clientName)
  const allowlistDocId = emailToDocId(email)
  const now = new Date().toISOString()
  const addedBy = input.addedBy?.trim() || "system-auto-provision"

  // ── Check what already exists ─────────────────────────────────────────────
  const [allowlistDoc, projectDoc] = await Promise.all([
    db.collection("ragAllowlist").doc(allowlistDocId).get(),
    db.collection("projects").doc(clientId).get(),
  ])

  const allowlistExists = allowlistDoc.exists
  const projectExists = projectDoc.exists

  // ── Write both in parallel ────────────────────────────────────────────────
  await Promise.all([
    // 1. ragAllowlist — grants login access to clients.readyaimgo.biz
    //    clientIds + memberships are written here so portal-auth can resolve
    //    the full contract even before the user completes account setup.
    db.collection("ragAllowlist").doc(allowlistDocId).set(
      {
        email,
        clientName,
        clientSlug,
        clientId,           // legacy single-clientId — kept for backward compat
        clientIds: [clientId],
        memberships: buildOwnerMembership(clientId),
        addedBy,
        addedAt: allowlistExists ? allowlistDoc.data()?.addedAt ?? now : now,
        updatedAt: now,
        active: true,
        notes: input.notes?.trim() ?? "",
      },
      { merge: true }
    ),

    // 2. projects — the portal reads this to determine what to show the client
    db.collection("projects").doc(clientId).set(
      {
        clientId,
        clientName,
        clientSlug,
        clientPortalEmail: email,     // KEY FIELD: portal resolves by this
        sourceNgo: input.sourceNgo?.trim() || "readyaimgo",
        status: "active",
        deliverables: input.deliverables ?? [],
        allowlistRef: allowlistDocId, // cross-reference to ragAllowlist
        provisionedAt: projectExists ? projectDoc.data()?.provisionedAt ?? now : now,
        updatedAt: now,
        provisionedBy: addedBy,
      },
      { merge: true }
    ),
  ])

  return {
    success: true,
    clientId,
    email,
    clientSlug,
    allowlistDocId,
    projectDocId: clientId,
    alreadyExisted: {
      allowlist: allowlistExists,
      project: projectExists,
    },
  }
}

/**
 * Revoke portal access — sets active: false on allowlist entry.
 * Does NOT delete the project record (preserves history).
 */
export async function revokeClientPortalAccess(email: string): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error("Firebase Admin is not configured")

  const docId = emailToDocId(email.trim().toLowerCase())
  await db.collection("ragAllowlist").doc(docId).set(
    { active: false, revokedAt: new Date().toISOString() },
    { merge: true }
  )
}

/**
 * Check if a client already has portal access provisioned.
 */
export async function getClientPortalAccessStatus(clientId: string): Promise<{
  hasAccess: boolean
  email: string | null
  active: boolean
  provisionedAt: string | null
}> {
  const db = getFirestoreDb()
  if (!db) throw new Error("Firebase Admin is not configured")

  const projectDoc = await db.collection("projects").doc(clientId).get()

  if (!projectDoc.exists) {
    return { hasAccess: false, email: null, active: false, provisionedAt: null }
  }

  const data = projectDoc.data()!
  const email = data.clientPortalEmail ?? null

  if (!email) {
    return { hasAccess: true, email: null, active: false, provisionedAt: data.provisionedAt ?? null }
  }

  const allowlistDocId = emailToDocId(email)
  const allowlistDoc = await db.collection("ragAllowlist").doc(allowlistDocId).get()
  const active = allowlistDoc.exists ? Boolean(allowlistDoc.data()?.active) : false

  return {
    hasAccess: true,
    email,
    active,
    provisionedAt: data.provisionedAt ?? null,
  }
}
