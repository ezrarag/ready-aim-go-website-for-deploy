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

import { FieldValue } from "firebase-admin/firestore"
import { getFirebaseAdminAuth, getFirestoreDb } from "@/lib/firestore"
import { emailToDocId, generateSlug } from "@/lib/beam-access-shared"
import type { ClientMembership, UserRole } from "@/lib/types/client-membership"
import {
  assignUserToWorkspace,
  ensureCanonicalWorkspace,
  recordPendingWorkspaceInvite,
} from "@/lib/workspace-access"

export type PortalAccessRole = Exclude<UserRole, "admin">

export type PortalProvisionInput = {
  clientId: string           // Firestore document ID in clients collection
  clientName: string         // Display name
  email: string              // Client's login email
  clientSlug?: string        // URL slug — derived from name if not provided
  deliverables?: string[]    // Initial deliverable list
  sourceNgo?: string         // BEAM NGO scope if applicable
  notes?: string             // Admin notes
  addedBy?: string           // Admin UID or identifier
  role?: PortalAccessRole    // Client workspace role
}

export type PortalProvisionResult = {
  success: true
  clientId: string
  email: string
  clientSlug: string
  allowlistDocId: string
  projectDocId: string
  workspaceId: string
  alreadyExisted: {
    allowlist: boolean
    project: boolean
  }
  assignedUserIds: string[]
}

function buildMembership(role: PortalAccessRole, createdAt?: unknown): ClientMembership {
  const now = new Date().toISOString()
  return {
    role,
    status: "active",
    createdAt: typeof createdAt === "string" && createdAt.trim() ? createdAt : now,
    updatedAt: now,
  }
}

function readMembershipCreatedAt(data: Record<string, unknown> | undefined, clientId: string) {
  const memberships =
    data?.memberships && typeof data.memberships === "object" && !Array.isArray(data.memberships)
      ? (data.memberships as Record<string, unknown>)
      : null
  const membership =
    memberships?.[clientId] && typeof memberships[clientId] === "object" && !Array.isArray(memberships[clientId])
      ? (memberships[clientId] as Record<string, unknown>)
      : null

  return membership?.createdAt
}

async function findExistingUserIdsByEmail(email: string): Promise<string[]> {
  const db = getFirestoreDb()
  if (!db) return []

  const ids = new Set<string>()
  const adminAuth = getFirebaseAdminAuth()

  if (adminAuth) {
    try {
      const user = await adminAuth.getUserByEmail(email)
      if (user.uid) ids.add(user.uid)
    } catch {
      // No Firebase Auth user exists yet for this email.
    }
  }

  const usersByEmail = await db.collection("users").where("email", "==", email).limit(20).get()
  for (const doc of usersByEmail.docs) {
    ids.add(doc.id)
  }

  return Array.from(ids)
}

export async function provisionClientPortalAccess(
  input: PortalProvisionInput
): Promise<PortalProvisionResult> {
  const db = getFirestoreDb()
  if (!db) throw new Error("Firebase Admin is not configured")

  const email = input.email.trim().toLowerCase()
  const clientName = input.clientName.trim()
  const clientId = input.clientId.trim()
  const clientSlug = generateSlug(input.clientSlug?.trim() || clientName)
  const allowlistDocId = emailToDocId(email)
  const now = new Date().toISOString()
  const addedBy = input.addedBy?.trim() || "system-auto-provision"
  const role: PortalAccessRole =
    input.role === "owner" ||
    input.role === "developer" ||
    input.role === "collaborator" ||
    input.role === "employee-of-client" ||
    input.role === "beam-participant"
      ? input.role
      : "collaborator"

  // ── Check what already exists ─────────────────────────────────────────────
  const [allowlistDoc, projectDoc] = await Promise.all([
    db.collection("ragAllowlist").doc(allowlistDocId).get(),
    db.collection("projects").doc(clientId).get(),
  ])

  const allowlistData = allowlistDoc.data() as Record<string, unknown> | undefined
  const projectData = projectDoc.data() as Record<string, unknown> | undefined
  const allowlistExists = allowlistDoc.exists
  const projectExists = projectDoc.exists
  const membership = buildMembership(role, readMembershipCreatedAt(allowlistData, clientId))
  const assignedUserIds = await findExistingUserIdsByEmail(email)
  const workspaceId = await ensureCanonicalWorkspace({
    db,
    clientId,
    clientName,
    clientEmail: email,
    projectId: clientId,
  })

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
        clientIds: FieldValue.arrayUnion(clientId),
        workspaceIds: FieldValue.arrayUnion(workspaceId),
        memberships: {
          [clientId]: membership,
        },
        addedBy,
        addedAt: allowlistExists ? allowlistData?.addedAt ?? now : now,
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
        workspaceId,
        clientName,
        clientSlug,
        clientPortalEmail:
          typeof projectData?.clientPortalEmail === "string" && projectData.clientPortalEmail
            ? projectData.clientPortalEmail
            : email,
        clientPortalEmails: FieldValue.arrayUnion(email),
        sourceNgo: input.sourceNgo?.trim() || "readyaimgo",
        status: "active",
        deliverables: input.deliverables ?? [],
        allowlistRef: allowlistDocId, // cross-reference to ragAllowlist
        provisionedAt: projectExists ? projectData?.provisionedAt ?? now : now,
        updatedAt: now,
        provisionedBy: addedBy,
      },
      { merge: true }
    ),
    ...assignedUserIds.flatMap((uid) => [
      db.collection("users").doc(uid).set(
        {
          email,
          client_id: clientId,
          clientIds: FieldValue.arrayUnion(clientId),
          workspaceIds: FieldValue.arrayUnion(workspaceId),
          memberships: {
            [clientId]: membership,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      db.collection("clients").doc(clientId).collection("members").doc(uid).set(
        {
          uid,
          email,
          workspaceId,
          role,
          status: "active",
          source: "manual-workspace-assignment",
          assignedBy: addedBy,
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
    ]),
  ])

  await Promise.all(
    assignedUserIds.length > 0
      ? assignedUserIds.map((uid) =>
          assignUserToWorkspace({
            db,
            workspaceId,
            uid,
            email,
            role,
            source: "manual-workspace-assignment",
          })
        )
      : [
          recordPendingWorkspaceInvite({
            db,
            workspaceId,
            email,
            role,
            invitedBy: addedBy,
          }),
        ]
  )

  return {
    success: true,
    clientId,
    email,
    clientSlug,
    allowlistDocId,
    projectDocId: clientId,
    workspaceId,
    alreadyExisted: {
      allowlist: allowlistExists,
      project: projectExists,
    },
    assignedUserIds,
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
