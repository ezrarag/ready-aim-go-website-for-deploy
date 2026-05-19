import { FieldValue } from "firebase-admin/firestore"
import { type NextRequest, NextResponse } from "next/server"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { emailToDocId, generateSlug } from "@/lib/beam-access-shared"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import type { ClientMembership, UserRole } from "@/lib/types/client-membership"
import { assignUserToWorkspace, ensureCanonicalWorkspace } from "@/lib/workspace-access"

type ClaimApprovalRole = Exclude<UserRole, "admin">

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function isClaimApprovalRole(value: unknown): value is ClaimApprovalRole {
  return (
    value === "owner" ||
    value === "developer" ||
    value === "collaborator" ||
    value === "employee-of-client" ||
    value === "beam-participant"
  )
}

function membershipFor(role: ClaimApprovalRole): ClientMembership {
  const now = new Date().toISOString()
  return {
    role,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const action = readString(body.action)
    const role = isClaimApprovalRole(body.role) ? body.role : "collaborator"
    const notes = readString(body.notes)

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, error: "action must be approve or reject" }, { status: 400 })
    }

    const requestRef = db.collection("clientClaimRequests").doc(id)
    const requestSnapshot = await requestRef.get()
    if (!requestSnapshot.exists) {
      return NextResponse.json({ success: false, error: "Claim request not found" }, { status: 404 })
    }

    const requestData = (requestSnapshot.data() ?? {}) as Record<string, unknown>
    const uid = readString(requestData.uid)
    const email = readString(requestData.email).toLowerCase()
    const requestedWorkspaceId = readString(requestData.requestedWorkspaceId)
    const clientId = (readString(requestData.requestedClientId) || requestedWorkspaceId).toLowerCase()
    const clientName =
      readString(requestData.requestedClientName) ||
      readString(requestData.requestedWorkspaceName) ||
      clientId
    const displayName = readString(requestData.displayName)

    if (!uid || !email || !clientId) {
      return NextResponse.json(
        { success: false, error: "Claim request is missing uid, email, or requestedClientId" },
        { status: 400 }
      )
    }

    if (action === "reject") {
      await requestRef.set(
        {
          status: "rejected",
          decisionNotes: notes,
          decidedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      await writeAuditLog({
        collection: "clientClaimRequests",
        docId: id,
        action: "reject",
        actorKey: extractActorKey(request.headers.get("authorization")),
        payload: { uid, email, clientId, notes },
      })

      const updated = await requestRef.get()
      return NextResponse.json({
        success: true,
        request: serializeFirestoreDocument(updated.id, updated.data()),
      })
    }

    const membership = membershipFor(role)
    const allowlistDocId = emailToDocId(email)
    const now = new Date().toISOString()
    const workspaceId = await ensureCanonicalWorkspace({
      db,
      clientId,
      clientName,
      clientEmail: email,
      preferredWorkspaceId: requestedWorkspaceId,
      projectId: clientId,
    })

    await Promise.all([
      db.collection("users").doc(uid).set(
        {
          email,
          displayName: displayName || null,
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
          displayName: displayName || null,
          workspaceId,
          role,
          status: "active",
          sourceClaimRequestId: id,
          approvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      db.collection("ragAllowlist").doc(allowlistDocId).set(
        {
          email,
          clientName,
          clientId,
          workspaceIds: FieldValue.arrayUnion(workspaceId),
          clientSlug: generateSlug(clientName || clientId),
          clientIds: FieldValue.arrayUnion(clientId),
          memberships: {
            [clientId]: membership,
          },
          active: true,
          updatedAt: now,
          notes,
        },
        { merge: true }
      ),
      db.collection("projects").doc(clientId).set(
        {
          clientId,
          workspaceId,
          clientName: clientName || clientId,
          clientSlug: generateSlug(clientName || clientId),
          clientPortalEmail: email,
          clientPortalEmails: FieldValue.arrayUnion(email),
          sourceNgo: "readyaimgo",
          status: "active",
          allowlistRef: allowlistDocId,
          updatedAt: now,
        },
        { merge: true }
      ),
      requestRef.set(
        {
          status: "approved",
          approvedRole: role,
          approvedWorkspaceId: workspaceId,
          decisionNotes: notes,
          decidedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      assignUserToWorkspace({
        db,
        workspaceId,
        uid,
        email,
        displayName,
        role,
        source: "claim-request-approval",
      }),
    ])

    await writeAuditLog({
      collection: "clientClaimRequests",
      docId: id,
      action: "approve",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { uid, email, clientId, workspaceId, role },
    })

    const updated = await requestRef.get()
    return NextResponse.json({
      success: true,
      request: serializeFirestoreDocument(updated.id, updated.data()),
    })
  } catch (error) {
    console.error("PATCH /api/clients/claim-requests/[id]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
