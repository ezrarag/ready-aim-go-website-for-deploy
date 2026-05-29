import { FieldValue } from "firebase-admin/firestore"
import { type NextRequest, NextResponse } from "next/server"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { getDefaultModules } from "@/lib/client-directory"
import { createClientDocument, getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { provisionClientPortalAccess } from "@/lib/provision-client-portal"

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isPortalPersonData(data: Record<string, unknown>): boolean {
  const id = readString(data.id)
  const storyId = readString(data.storyId)
  const portalAccessStatus = readString(data.portalAccessStatus)
  return Boolean(
    data.recordType === "portal_person" ||
      data.adminApprovalPending === true ||
      readString(data.assignedClientId) ||
      portalAccessStatus === "pending_manual_provision" ||
      portalAccessStatus === "assigned" ||
      isEmail(id) ||
      isEmail(storyId)
  )
}

function buildMembership() {
  const now = new Date().toISOString()
  return {
    role: "owner",
    status: "active",
    createdAt: now,
    updatedAt: now,
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const email = readString(body.email).toLowerCase()
    const name = readString(body.name)
    const storyId = readString(body.storyId)
    const portalUid = readString(body.portalUid)
    const portalPersonId = readString(body.portalPersonId)
    const sourceProjectId = readString(body.sourceProjectId)
    const notes = readString(body.notes)

    if (!isEmail(email)) {
      return NextResponse.json({ success: false, error: "A valid email is required" }, { status: 400 })
    }
    if (!name || !storyId) {
      return NextResponse.json({ success: false, error: "name and storyId are required" }, { status: 400 })
    }
    if (!portalUid && !portalPersonId && !sourceProjectId) {
      return NextResponse.json(
        { success: false, error: "portalUid, portalPersonId, or sourceProjectId is required" },
        { status: 400 }
      )
    }

    let sourceProjectSnapshot: FirebaseFirestore.DocumentSnapshot | null = null
    if (sourceProjectId) {
      sourceProjectSnapshot = await db.collection("projects").doc(sourceProjectId).get()
      if (!sourceProjectSnapshot.exists) {
        return NextResponse.json({ success: false, error: "Source project not found" }, { status: 404 })
      }
    }

    const portalPersonSnapshots = new Map<string, FirebaseFirestore.DocumentSnapshot>()
    const addSnapshot = (snapshot: FirebaseFirestore.DocumentSnapshot | null | undefined) => {
      if (snapshot?.exists) portalPersonSnapshots.set(snapshot.id, snapshot)
    }

    if (portalPersonId && !portalPersonId.startsWith("portal_")) {
      addSnapshot(await db.collection("clients").doc(portalPersonId).get())
    }
    addSnapshot(await db.collection("clients").doc(email).get())

    const byClientPortalEmail = await db.collection("clients").where("clientPortalEmail", "==", email).limit(10).get()
    byClientPortalEmail.docs.forEach(addSnapshot)

    const assignablePortalDocs = Array.from(portalPersonSnapshots.values()).filter((snapshot) => {
      const data = { id: snapshot.id, ...(snapshot.data() ?? {}) } as Record<string, unknown>
      return isPortalPersonData(data)
    })

    const alreadyAssignedDoc = assignablePortalDocs.find((snapshot) => {
      const data = snapshot.data() as Record<string, unknown> | undefined
      return Boolean(readString(data?.assignedClientId))
    })
    if (alreadyAssignedDoc) {
      return NextResponse.json(
        { success: false, error: "This portal person is already assigned to a client" },
        { status: 409 }
      )
    }

    if (portalUid) {
      const userDoc = await db.collection("users").doc(portalUid).get()
      const userData = userDoc.data() as Record<string, unknown> | undefined
      const assignedClientId = readString(userData?.client_id)
      if (assignedClientId) {
        return NextResponse.json(
          { success: false, error: "This portal user is already assigned to a client" },
          { status: 409 }
        )
      }
    }

    const now = new Date().toISOString()
    const clientId = await createClientDocument({
      recordType: "relationship",
      name,
      storyId,
      contactEmail: email,
      clientPortalEmail: email,
      status: "onboarding",
      lastActivity: `Client created from portal person ${email}`,
      updatedAt: now,
      showOnFrontend: false,
      modules: getDefaultModules(),
      brands: [],
    })

    const portalResult = await provisionClientPortalAccess({
      clientId,
      clientName: name,
      email,
      clientSlug: storyId,
      notes,
      role: "owner",
      addedBy: "admin-create-client-from-portal-person",
    }).catch(async (error) => {
      await db.collection("clients").doc(clientId).delete().catch(() => undefined)
      throw error
    })

    const membership = buildMembership()
    const portalPersonPatch = {
      recordType: "portal_person",
      adminApprovalPending: false,
      portalAccessStatus: "assigned",
      assignedClientId: clientId,
      assignedWorkspaceId: portalResult.workspaceId,
      assignedRole: "owner",
      assignedAt: now,
      updatedAt: now,
    }

    const batch = db.batch()
    batch.set(
      db.collection("clients").doc(clientId),
      {
        clientPortalEmail: email,
        clientPortalEmails: FieldValue.arrayUnion(email),
        contactEmail: email,
        portalAccessStatus: "active",
        workspaceId: portalResult.workspaceId,
        updatedAt: now,
      },
      { merge: true }
    )

    if (sourceProjectSnapshot?.exists) {
      batch.set(
        sourceProjectSnapshot.ref,
        {
          clientId,
          clientName: name,
          clientPortalEmail: email,
          clientPortalEmails: FieldValue.arrayUnion(email),
          workspaceId: portalResult.workspaceId,
          updatedAt: now,
        },
        { merge: true }
      )
    }

    for (const snapshot of assignablePortalDocs) {
      if (snapshot.id !== clientId) {
        batch.set(snapshot.ref, portalPersonPatch, { merge: true })
      }
    }

    if (portalUid) {
      batch.set(
        db.collection("users").doc(portalUid),
        {
          email,
          client_id: clientId,
          pending_client_id: FieldValue.delete(),
          portal_access_status: "active",
          clientIds: FieldValue.arrayUnion(clientId),
          workspaceIds: FieldValue.arrayUnion(portalResult.workspaceId),
          memberships: { [clientId]: membership },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    }

    await batch.commit()

    await writeAuditLog({
      collection: "clients",
      docId: clientId,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: {
        source: "portal-person",
        email,
        portalUid: portalUid || null,
        portalPersonId: portalPersonId || null,
        sourceProjectId: sourceProjectId || null,
        assignedWorkspaceId: portalResult.workspaceId,
        role: "owner",
      },
    })

    return NextResponse.json({
      success: true,
      clientId,
      workspaceId: portalResult.workspaceId,
      email,
      message: `Created ${name} and assigned ${email} as owner.`,
    })
  } catch (error) {
    console.error("POST /api/admin/clients/from-portal-person:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
