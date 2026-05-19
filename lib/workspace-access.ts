import { FieldValue, type Firestore } from "firebase-admin/firestore"
import { emailToDocId, generateSlug } from "@/lib/beam-access-shared"
import type { UserRole } from "@/lib/types/client-membership"

export type CanonicalWorkspaceRole = Exclude<UserRole, "admin">

type EnsureWorkspaceInput = {
  db: Firestore
  clientId: string
  clientName: string
  clientEmail?: string | null
  preferredWorkspaceId?: string | null
  projectId?: string | null
}

type WorkspaceMemberInput = {
  db: Firestore
  workspaceId: string
  uid: string
  email: string
  displayName?: string | null
  role: CanonicalWorkspaceRole
  source: string
}

type PendingWorkspaceInviteInput = {
  db: Firestore
  workspaceId: string
  email: string
  role: CanonicalWorkspaceRole
  invitedBy?: string | null
}

function readString(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function buildWorkspaceId(clientId: string, clientName: string) {
  return generateSlug(clientName || clientId) || clientId.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()
}

export async function ensureCanonicalWorkspace({
  db,
  clientId,
  clientName,
  clientEmail,
  preferredWorkspaceId,
  projectId,
}: EnsureWorkspaceInput): Promise<string> {
  const normalizedClientId = clientId.trim().toLowerCase()
  const normalizedProjectId = projectId?.trim() || normalizedClientId
  const now = FieldValue.serverTimestamp()

  const [clientSnap, projectSnap] = await Promise.all([
    db.collection("clients").doc(normalizedClientId).get(),
    db.collection("projects").doc(normalizedProjectId).get(),
  ])

  const clientData = clientSnap.exists ? (clientSnap.data() as Record<string, unknown>) : undefined
  const projectData = projectSnap.exists ? (projectSnap.data() as Record<string, unknown>) : undefined

  let workspaceId =
    preferredWorkspaceId?.trim() ||
    readString(clientData, "workspaceId") ||
    readString(projectData, "workspaceId")

  if (!workspaceId) {
    const workspaceByClient = await db
      .collection("workspaces")
      .where("clientId", "==", normalizedClientId)
      .limit(1)
      .get()
    workspaceId = workspaceByClient.docs[0]?.id || buildWorkspaceId(normalizedClientId, clientName)
  }

  const workspaceRef = db.collection("workspaces").doc(workspaceId)
  const workspaceSnap = await workspaceRef.get()
  const existing = workspaceSnap.exists ? (workspaceSnap.data() as Record<string, unknown>) : undefined
  const name = clientName.trim() || readString(clientData, "name") || readString(clientData, "companyName") || normalizedClientId

  const workspacePayload: Record<string, unknown> = {
    name,
    clientId: normalizedClientId,
    clientEmail: clientEmail?.trim().toLowerCase() || readString(clientData, "email") || null,
    projectIds: FieldValue.arrayUnion(normalizedProjectId),
    updatedAt: now,
  }

  if (!workspaceSnap.exists) {
    Object.assign(workspacePayload, {
      ownerUid: "",
      repos: [],
      vercelProjects: [],
      memberCount: 0,
      domains: [],
      domainRole: "employee-of-client",
      githubOrg: null,
      vercelTeamId: null,
      hosting: {
        primaryProvider: "vercel",
        domainRegistrars: [],
        manualDnsTargets: [],
        staticHosts: [],
        infrastructureFlags: {
          hasExternalDns: false,
          hasManualRecords: false,
          hasStaticFallback: false,
          needsDnsReview: false,
        },
        notes: null,
      },
      meetingProviders: [],
      orgId: readString(clientData, "orgId") || null,
      stripeCustomerId: readString(clientData, "stripeCustomerId") || null,
      contractIds: [],
      createdAt: now,
    })
  } else if (!readString(existing, "clientEmail") && clientEmail) {
    workspacePayload.clientEmail = clientEmail.trim().toLowerCase()
  }

  await Promise.all([
    workspaceRef.set(workspacePayload, { merge: true }),
    db.collection("clients").doc(normalizedClientId).set(
      {
        workspaceId,
        updatedAt: now,
      },
      { merge: true }
    ),
    db.collection("projects").doc(normalizedProjectId).set(
      {
        workspaceId,
        clientId: normalizedClientId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
  ])

  return workspaceId
}

export async function assignUserToWorkspace({
  db,
  workspaceId,
  uid,
  email,
  displayName,
  role,
  source,
}: WorkspaceMemberInput): Promise<void> {
  const now = FieldValue.serverTimestamp()
  const memberRef = db.collection("workspaces").doc(workspaceId).collection("members").doc(uid)
  const memberSnap = await memberRef.get()

  await Promise.all([
    memberRef.set(
      {
        uid,
        email: email.trim().toLowerCase(),
        displayName: displayName || null,
        role,
        status: "active",
        source,
        addedAt: memberSnap.exists ? (memberSnap.data() as Record<string, unknown>)?.addedAt ?? now : now,
        updatedAt: now,
        assignedRepos: Array.isArray((memberSnap.data() as Record<string, unknown> | undefined)?.assignedRepos)
          ? (memberSnap.data() as Record<string, unknown>).assignedRepos
          : [],
        assignedVercelIds: Array.isArray((memberSnap.data() as Record<string, unknown> | undefined)?.assignedVercelIds)
          ? (memberSnap.data() as Record<string, unknown>).assignedVercelIds
          : [],
      },
      { merge: true }
    ),
    db.collection("workspaces").doc(workspaceId).set(
      {
        memberCount: memberSnap.exists ? FieldValue.increment(0) : FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true }
    ),
    db.collection("users").doc(uid).set(
      {
        email: email.trim().toLowerCase(),
        workspaceIds: FieldValue.arrayUnion(workspaceId),
        updatedAt: now,
      },
      { merge: true }
    ),
  ])
}

export async function recordPendingWorkspaceInvite({
  db,
  workspaceId,
  email,
  role,
  invitedBy,
}: PendingWorkspaceInviteInput): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("pendingInvites")
    .doc(emailToDocId(normalizedEmail))
    .set(
      {
        email: normalizedEmail,
        role,
        invitedByUid: invitedBy || null,
        invitedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
}
