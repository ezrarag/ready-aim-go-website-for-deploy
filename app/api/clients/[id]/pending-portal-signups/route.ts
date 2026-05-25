import { FieldValue } from "firebase-admin/firestore"
import { type NextRequest, NextResponse } from "next/server"

import { emailToDocId, generateSlug } from "@/lib/beam-access-shared"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { decodeRouteParam } from "@/lib/route-params"

const DEFAULT_REPOSITORY_CHAIN = "ezrarag/mkeblack"

type AssignableRole = "owner" | "developer" | "collaborator" | "employee-of-client" | "beam-participant"
type CandidateSource = "pending-client-signup" | "portal-user"

type AssignmentCandidate = {
  id: string
  source: CandidateSource
  email: string
  displayName: string
  companyName: string
  uid: string
  role: string
  organizationType: string
  notes: string
  serviceInterests: string[]
  assignedClientIds: string[]
  createdAt: unknown
  updatedAt: unknown
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function readRole(value: unknown): AssignableRole {
  return value === "owner" ||
    value === "developer" ||
    value === "collaborator" ||
    value === "employee-of-client" ||
    value === "beam-participant"
    ? value
    : "collaborator"
}

function readRepositoryChains(value: unknown, fallback: unknown): string[] {
  const source = Array.isArray(value) && value.length > 0 ? value : fallback
  const list = Array.isArray(source) ? source : typeof source === "string" ? [source] : []
  const normalized = Array.from(
    new Set(list.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))
  )
  return normalized.length > 0 ? normalized : [DEFAULT_REPOSITORY_CHAIN]
}

function buildPendingCandidate(id: string, data: Record<string, unknown>): AssignmentCandidate {
  const portalSignup = readObject(data.portalSignup)
  return {
    id,
    source: "pending-client-signup",
    email:
      readString(portalSignup.email).toLowerCase() ||
      readString(data.clientPortalEmail).toLowerCase() ||
      readString(data.contactEmail).toLowerCase(),
    displayName: readString(portalSignup.fullName) || readString(data.contactName) || readString(data.name),
    companyName: readString(data.name),
    uid: readString(portalSignup.uid),
    role: readString(portalSignup.role),
    organizationType: readString(data.organizationType),
    notes: readString(portalSignup.notes),
    serviceInterests: readStringArray(portalSignup.serviceInterests),
    assignedClientIds: readString(data.assignedClientId) ? [readString(data.assignedClientId)] : [],
    createdAt: data.createdAt ?? portalSignup.createdAt ?? null,
    updatedAt: data.updatedAt ?? portalSignup.updatedAt ?? null,
  }
}

function buildUserCandidate(uid: string, data: Record<string, unknown>): AssignmentCandidate {
  const clientIds = readStringArray(data.clientIds)
  const email = readString(data.email).toLowerCase()
  return {
    id: uid,
    source: "portal-user",
    email,
    displayName: readString(data.displayName) || readString(data.full_name) || readString(data.name) || email,
    companyName: readString(data.company_name),
    uid,
    role: readString(data.userRole),
    organizationType: readString(data.organization_type),
    notes: "",
    serviceInterests: [],
    assignedClientIds: clientIds,
    createdAt: data.created_at ?? data.createdAt ?? null,
    updatedAt: data.updated_at ?? data.updatedAt ?? null,
  }
}

function mergeCandidate(
  candidates: Map<string, AssignmentCandidate>,
  candidate: AssignmentCandidate,
  activeClientId: string
) {
  if (!candidate.email && !candidate.displayName && !candidate.companyName) return
  if (candidate.assignedClientIds.includes(activeClientId)) return

  const key = candidate.uid || candidate.email || candidate.id
  const existing = candidates.get(key)
  if (!existing) {
    candidates.set(key, candidate)
    return
  }

  candidates.set(key, {
    ...existing,
    ...candidate,
    source: existing.source === "pending-client-signup" ? existing.source : candidate.source,
    id: existing.source === "pending-client-signup" ? existing.id : candidate.id,
    email: existing.email || candidate.email,
    displayName: existing.displayName || candidate.displayName,
    companyName: existing.companyName || candidate.companyName,
    uid: existing.uid || candidate.uid,
    assignedClientIds: Array.from(new Set([...existing.assignedClientIds, ...candidate.assignedClientIds])),
  })
}

function membershipFor(role: AssignableRole) {
  const now = new Date().toISOString()
  return {
    role,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const activeClientId = decodeRouteParam(id)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10) || 50, 200)
    const [approvalPendingSnapshot, legacyPendingSnapshot, usersSnapshot] = await Promise.all([
      db.collection("clients").where("adminApprovalPending", "==", true).limit(limit).get(),
      db.collection("clients").where("portalAccessStatus", "==", "pending_manual_provision").limit(limit).get(),
      db.collection("users").limit(limit).get(),
    ])

    const candidates = new Map<string, AssignmentCandidate>()
    const pendingDocsById = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    for (const doc of approvalPendingSnapshot.docs) pendingDocsById.set(doc.id, doc)
    for (const doc of legacyPendingSnapshot.docs) pendingDocsById.set(doc.id, doc)

    for (const doc of pendingDocsById.values()) {
      const candidate = buildPendingCandidate(doc.id, serializeFirestoreDocument(doc.id, doc.data()))
      mergeCandidate(candidates, candidate, activeClientId)
    }

    for (const doc of usersSnapshot.docs) {
      const candidate = buildUserCandidate(doc.id, serializeFirestoreDocument(doc.id, doc.data()))
      mergeCandidate(candidates, candidate, activeClientId)
    }

    const results = Array.from(candidates.values()).sort((a, b) =>
      String(b.createdAt ?? b.updatedAt ?? "").localeCompare(String(a.createdAt ?? a.updatedAt ?? ""))
    )

    return NextResponse.json({ success: true, candidates: results })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const clientId = decodeRouteParam(id)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const pendingClientId = readString(body.pendingClientId)
    const uidInput = readString(body.uid)
    const role = readRole(body.role)
    const notes = readString(body.notes)

    if (!pendingClientId && !uidInput) {
      return NextResponse.json({ success: false, error: "pendingClientId or uid is required" }, { status: 400 })
    }

    const assigned = await db.runTransaction(async (transaction) => {
      const targetRef = db.collection("clients").doc(clientId)
      const pendingRef = pendingClientId ? db.collection("clients").doc(pendingClientId) : null
      const userRefFromInput = uidInput ? db.collection("users").doc(uidInput) : null
      const [targetSnapshot, pendingSnapshot, userSnapshotFromInput] = await Promise.all([
        transaction.get(targetRef),
        pendingRef ? transaction.get(pendingRef) : Promise.resolve(null),
        userRefFromInput ? transaction.get(userRefFromInput) : Promise.resolve(null),
      ])

      if (!targetSnapshot.exists) throw new Error(`Client not found: clients/${clientId}`)
      if (pendingRef && !pendingSnapshot?.exists) throw new Error(`Pending signup not found: clients/${pendingClientId}`)
      if (userRefFromInput && !userSnapshotFromInput?.exists) throw new Error(`User not found: users/${uidInput}`)

      const targetData = serializeFirestoreDocument(targetSnapshot.id, targetSnapshot.data())
      const pendingData = pendingSnapshot?.exists
        ? serializeFirestoreDocument(pendingSnapshot.id, pendingSnapshot.data())
        : null
      const userDataFromInput = userSnapshotFromInput?.exists
        ? serializeFirestoreDocument(userSnapshotFromInput.id, userSnapshotFromInput.data())
        : null
      const pendingCandidate = pendingData ? buildPendingCandidate(pendingSnapshot!.id, pendingData) : null
      const userCandidate = userDataFromInput ? buildUserCandidate(userSnapshotFromInput!.id, userDataFromInput) : null
      const candidate = pendingCandidate ?? userCandidate
      const portalSignup = pendingData ? readObject(pendingData.portalSignup) : {}

      if (!candidate) throw new Error("Unable to resolve assignment candidate.")
      if (
        pendingData &&
        pendingData.adminApprovalPending !== true &&
        pendingData.portalAccessStatus !== "pending_manual_provision" &&
        pendingData.portalAccessStatus !== "assigned"
      ) {
        throw new Error("This portal signup is not available for workspace assignment.")
      }
      if (!candidate.uid || !candidate.email) {
        throw new Error("Portal person is missing a Firebase uid or email.")
      }

      const targetName = readString(targetData.name) || clientId
      const workspaceId = readString(body.workspaceId) || readString(targetData.workspaceId) || clientId
      const repositoryChains = readRepositoryChains(body.repositoryChains, targetData.githubRepos)
      const primaryRepo = readString(targetData.githubRepo) || repositoryChains[0] || DEFAULT_REPOSITORY_CHAIN
      const displayName = candidate.displayName || readString(portalSignup.fullName) || candidate.email
      const membership = membershipFor(role)
      const now = new Date().toISOString()

      transaction.set(
        targetRef,
        {
          recordType: "relationship",
          workspaceId,
          githubRepo: primaryRepo,
          githubRepos: FieldValue.arrayUnion(...repositoryChains),
          clientPortalEmail: readString(targetData.clientPortalEmail) || candidate.email,
          clientPortalEmails: FieldValue.arrayUnion(candidate.email),
          portalAccessStatus: "active",
          updatedAt: now,
        },
        { merge: true }
      )

      if (pendingRef) {
        transaction.set(
          pendingRef,
          {
            recordType: "portal_person",
            adminApprovalPending: false,
            portalAccessStatus: "assigned",
            assignedClientId: clientId,
            assignedWorkspaceId: workspaceId,
            assignedRole: role,
            assignedAt: now,
            repositoryChains,
            updatedAt: now,
          },
          { merge: true }
        )
      } else if (candidate.email) {
        transaction.set(
          db.collection("clients").doc(candidate.email),
          {
            recordType: "portal_person",
            portalAccessStatus: "assigned",
            assignedClientId: clientId,
            assignedWorkspaceId: workspaceId,
            assignedRole: role,
            assignedAt: now,
            updatedAt: now,
          },
          { merge: true }
        )
      }

      transaction.set(
        db.collection("workspaces").doc(workspaceId),
        {
          id: workspaceId,
          clientId,
          name: targetName,
          status: "active",
          githubRepo: primaryRepo,
          githubRepos: FieldValue.arrayUnion(...repositoryChains),
          repositoryChains: FieldValue.arrayUnion(...repositoryChains),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      transaction.set(
        db.collection("users").doc(candidate.uid),
        {
          email: candidate.email,
          displayName,
          full_name: displayName,
          client_id: clientId,
          pending_client_id: FieldValue.delete(),
          portal_access_status: "active",
          clientIds: FieldValue.arrayUnion(clientId),
          workspaceIds: FieldValue.arrayUnion(workspaceId),
          memberships: { [clientId]: membership },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      transaction.set(
        targetRef.collection("members").doc(candidate.uid),
        {
          uid: candidate.uid,
          email: candidate.email,
          displayName,
          workspaceId,
          role,
          status: "active",
          source: pendingRef ? "admin-pending-portal-signup" : "admin-existing-portal-user",
          sourcePendingClientId: pendingClientId || null,
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      transaction.set(
        db.collection("workspaces").doc(workspaceId).collection("members").doc(candidate.uid),
        {
          uid: candidate.uid,
          email: candidate.email,
          displayName,
          role,
          status: "active",
          source: pendingRef ? "admin-pending-portal-signup" : "admin-existing-portal-user",
          clientId,
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      transaction.set(
        db.collection("ragAllowlist").doc(emailToDocId(candidate.email)),
        {
          email: candidate.email,
          clientId,
          clientName: targetName,
          clientSlug: readString(targetData.storyId) || generateSlug(targetName || clientId),
          clientIds: FieldValue.arrayUnion(clientId),
          workspaceIds: FieldValue.arrayUnion(workspaceId),
          memberships: { [clientId]: membership },
          active: true,
          notes,
          updatedAt: now,
        },
        { merge: true }
      )

      transaction.set(
        db.collection("projects").doc(clientId),
        {
          clientId,
          workspaceId,
          clientName: targetName,
          clientSlug: readString(targetData.storyId) || generateSlug(targetName || clientId),
          clientPortalEmail: candidate.email,
          clientPortalEmails: FieldValue.arrayUnion(candidate.email),
          repositoryChains,
          githubRepo: primaryRepo,
          githubRepos: FieldValue.arrayUnion(...repositoryChains),
          sourceNgo: "readyaimgo",
          status: "active",
          updatedAt: now,
        },
        { merge: true }
      )

      return {
        uid: candidate.uid,
        email: candidate.email,
        clientId,
        pendingClientId: pendingClientId || null,
        workspaceId,
        role,
        repositoryChains,
      }
    })

    return NextResponse.json({ success: true, assigned })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
