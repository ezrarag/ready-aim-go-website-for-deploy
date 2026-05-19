import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { decodeRouteParam } from "@/lib/route-params"

type PortalMember = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  role: string
  status: string
  source: string
  approvedAt: unknown
  updatedAt: unknown
  lastLoginAt: unknown
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readMap(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function mergeMember(
  members: Map<string, PortalMember>,
  uid: string,
  patch: Partial<PortalMember>
) {
  const current = members.get(uid)
  members.set(uid, {
    uid,
    email: patch.email ?? current?.email ?? null,
    displayName: patch.displayName ?? current?.displayName ?? null,
    photoURL: patch.photoURL ?? current?.photoURL ?? null,
    role: patch.role ?? current?.role ?? "collaborator",
    status: patch.status ?? current?.status ?? "active",
    source: patch.source ?? current?.source ?? "users",
    approvedAt: patch.approvedAt ?? current?.approvedAt ?? null,
    updatedAt: patch.updatedAt ?? current?.updatedAt ?? null,
    lastLoginAt: patch.lastLoginAt ?? current?.lastLoginAt ?? null,
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const clientId = decodeRouteParam(id).toLowerCase()
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const members = new Map<string, PortalMember>()
    const subcollectionSnapshot = await db
      .collection("clients")
      .doc(clientId)
      .collection("members")
      .limit(200)
      .get()

    for (const doc of subcollectionSnapshot.docs) {
      const data = serializeFirestoreDocument(doc.id, doc.data())
      mergeMember(members, doc.id, {
        email: readString(data.email),
        displayName: readString(data.displayName),
        photoURL: readString(data.photoURL),
        role: readString(data.role) ?? "collaborator",
        status: readString(data.status) ?? "active",
        source: readString(data.source) ?? "clients.members",
        approvedAt: data.approvedAt ?? null,
        updatedAt: data.updatedAt ?? null,
        lastLoginAt: data.lastLoginAt ?? null,
      })
    }

    const usersSnapshot = await db
      .collection("users")
      .where("clientIds", "array-contains", clientId)
      .limit(200)
      .get()

    for (const doc of usersSnapshot.docs) {
      const data = serializeFirestoreDocument(doc.id, doc.data())
      const memberships = readMap(data.memberships)
      const membership = readMap(memberships?.[clientId])
      mergeMember(members, doc.id, {
        email: readString(data.email),
        displayName: readString(data.displayName) ?? readString(data.name),
        photoURL: readString(data.photoURL),
        role: readString(membership?.role) ?? readString(data.userRole) ?? "collaborator",
        status: readString(membership?.status) ?? "active",
        source: members.has(doc.id) ? "users + clients.members" : "users",
        updatedAt: data.updatedAt ?? membership?.updatedAt ?? null,
        lastLoginAt: data.lastLoginAt ?? data.portalLastLoginAt ?? null,
      })
    }

    const results = Array.from(members.values()).sort((a, b) =>
      String(a.email ?? a.displayName ?? a.uid).localeCompare(String(b.email ?? b.displayName ?? b.uid))
    )

    return NextResponse.json({ success: true, members: results })
  } catch (error) {
    console.error("GET /api/clients/[id]/portal-members:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
