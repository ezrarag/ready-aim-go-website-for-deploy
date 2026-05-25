import { FieldValue } from "firebase-admin/firestore"
import { type NextRequest, NextResponse } from "next/server"

import { emailToDocId, generateSlug } from "@/lib/beam-access-shared"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { decodeRouteParam } from "@/lib/route-params"

const DEFAULT_REPOSITORY_CHAIN = "ezrarag/mkeblack"

type AssignableRole = "owner" | "developer" | "collaborator" | "employee-of-client" | "beam-participant"

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
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

function buildCandidate(id: string, data: Record<string, unknown>) {
  const portalSignup = readObject(data.portalSignup)
  return {
    id,
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
    serviceInterests: Array.isArray(portalSignup.serviceInterests)
      ? portalSignup.serviceInterests.filter((item): item is string => typeof item === "string")
      : [],
    createdAt: data.createdAt ?? portalSignup.createdAt ?? null,
    updatedAt: data.updatedAt ?? portalSignup.updatedAt ?? null,
  }
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

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10) || 50, 200)
    const [approvalPendingSnapshot, legacyPendingSnapshot] = await Promise.all([
      db.collection("clients").where("adminApprovalPending", "==", true).limit(limit).get(),
      db.collection("clients").where("portalAccessStatus", "==", "pending_manual_provision").limit(limit).get(),
    ])

    const docsById = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    for (const doc of approvalPendingSnapshot.docs) docsById.set(doc.id, doc)
    for (const doc of legacyPendingSnapshot.docs) docsById.set(doc.id, doc)

    const candidates = Array.from(docsById.values())
      .map((doc) => buildCandidate(doc.id, serializeFirestoreDocument(doc.id, doc.data())))
      .filter((candidate) => candidate.email || candidate.displayName || candidate.companyName)
      .sort((a, b) =>
        String(b.createdAt ?? b.updatedAt ?? "").localeCompare(String(a.createdAt ?? a.updatedAt ?? ""))
      )

    return NextResponse.json({ success: true, candidates })
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
    const role = readRole(body.role)
    const notes = readString(body.notes)

    if (!pendingClientId) {
      return NextResponse.json({ success: false, error: "pendingClientId is required" }, { status: 400 })
    }

    const assigned = await db.runTransaction(async (transaction) => {
      const targetRef = db.collection("clients").doc(clientId)
      const pendingRef = db.collection("clients").doc(pendingClientId)
      const [targetSnapshot, pendingSnapshot] = await Promise.all([
        transaction.get(targetRef),
        transaction.get(pendingRef),
      ])

      if (!targetSnapshot.exists) throw new Error(`Client not found: clients/${clientId}`)
      if (!pendingSnapshot.exists) throw new Error(`Pending signup not found: clients/${pendingClientId}`)

      const targetData = serializeFirestoreDocument(targetSnapshot.id, targetSnapshot.data())
      const pendingData = serializeFirestoreDocument(pendingSnapshot.id, pendingSnapshot.data())
      const candidate = buildCandidate(pendingSnapshot.id, pendingData)
      const portalSignup = readObject(pendingData.portalSignup)

      if (
        pendingData.adminApprovalPending !== true &&
        pendingData.portalAccessStatus !== "pending_manual_provision"
      ) {
        throw new Error("This portal signup is no longer pending admin approval.")
      }
      if (!candidate.uid || !candidate.email) {
        throw new Error("Pending portal signup is missing its Firebase uid or email.")
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

      transaction.set(
        pendingRef,
        {
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
          sourcePendingClientId: pendingClientId,
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
          source: "admin-pending-portal-signup",
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

      return { uid: candidate.uid, email: candidate.email, clientId, pendingClientId, workspaceId, role, repositoryChains }
    })

    return NextResponse.json({ success: true, assigned })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
