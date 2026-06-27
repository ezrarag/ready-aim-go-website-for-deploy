import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isPortalPersonRecord(record: Record<string, unknown>): boolean {
  const id = readString(record.id)
  const storyId = readString(record.storyId)
  const portalAccessStatus = readString(record.portalAccessStatus)
  return Boolean(
    record.recordType === "portal_person" ||
    record.adminApprovalPending === true ||
    readString(record.assignedClientId) ||
    portalAccessStatus === "pending_manual_provision" ||
    portalAccessStatus === "assigned" ||
    looksLikeEmail(id) ||
    looksLikeEmail(storyId)
  )
}

function isRelationshipRecord(record: Record<string, unknown>): boolean {
  if (record.recordType === "relationship") return true
  if (record.recordType === "portal_person" || record.recordType === "legacy") return false
  return !isPortalPersonRecord(record)
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value === "number") return new Date(value).toISOString()
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }
  return null
}

function buildPortalPersonFromUser(uid: string, user: Record<string, unknown>) {
  const email = readString(user.email).toLowerCase()
  if (!email) return null

  const clientIds = readStringArray(user.clientIds)
  const assignedClientId = readString(user.client_id) || clientIds[0] || ""
  const displayName =
    readString(user.displayName) ||
    readString(user.full_name) ||
    readString(user.name) ||
    email
  const updatedAt =
    timestampToIso(user.updatedAt) ||
    timestampToIso(user.updated_at) ||
    timestampToIso(user.createdAt) ||
    timestampToIso(user.created_at) ||
    new Date().toISOString()

  return {
    id: `portal_${uid}`,
    recordType: "portal_person",
    storyId: email,
    name: displayName,
    brands: [],
    contactEmail: email,
    clientPortalEmail: email,
    portalUid: uid,
    portalAccessStatus: assignedClientId ? "assigned" : "pending_manual_provision",
    adminApprovalPending: !assignedClientId,
    assignedClientId: assignedClientId || undefined,
    status: assignedClientId ? "active" : "onboarding",
    lastActivity: assignedClientId
      ? `Portal user linked to ${assignedClientId}`
      : "Portal user signed in; workspace assignment pending",
    updatedAt,
    pulseSummary: "",
    deployStatus: "building",
    deployUrl: "",
    githubRepo: "",
    githubRepos: [],
    deployHosts: [],
    stripeStatus: "pending",
    revenue: 0,
    meetings: 0,
    emails: 0,
    commits: 0,
    lastDeploy: "",
    storyVideoUrl: "",
    showOnFrontend: false,
    isNewStory: false,
    websiteUrl: "",
    appUrl: "",
    appStoreUrl: "",
    rdUrl: "",
    housingUrl: "",
    transportationUrl: "",
    insuranceUrl: "",
  }
}

function getPortalIdentityKeys(record: Record<string, unknown>) {
  return [
    readString(record.portalUid),
    readString(record.clientPortalEmail).toLowerCase(),
    readString(record.contactEmail).toLowerCase(),
    looksLikeEmail(readString(record.id)) ? readString(record.id).toLowerCase() : "",
    looksLikeEmail(readString(record.storyId)) ? readString(record.storyId).toLowerCase() : "",
  ].filter(Boolean)
}

// GET /api/admin/clients — list all client documents
export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const includePeople = searchParams.get("includePeople") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200)

    let query: FirebaseFirestore.Query = db.collection("clients")
    if (status) query = query.where("status", "==", status)
    const snap = await query.limit(limit).get()

    const records = snap.docs
      .map((d) => serializeFirestoreDocument(d.id, d.data()))
      .filter((record) => status === "archived" || readString(record.status) !== "archived")
    let data = includePeople ? records : records.filter(isRelationshipRecord)

    if (includePeople) {
      const representedPortalPeople = new Set<string>()
      for (const record of records) {
        if (!isPortalPersonRecord(record)) continue
        for (const key of getPortalIdentityKeys(record)) representedPortalPeople.add(key)
      }

      const usersSnap = await db.collection("users").limit(limit).get()
      const syntheticPortalPeople = usersSnap.docs
        .map((doc) => buildPortalPersonFromUser(doc.id, serializeFirestoreDocument(doc.id, doc.data())))
        .filter((record): record is NonNullable<typeof record> => Boolean(record))
        .filter((record) =>
          getPortalIdentityKeys(record).every((key) => !representedPortalPeople.has(key))
        )

      data = [...data, ...syntheticPortalPeople]
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("GET /api/admin/clients:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients — create a new client document
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) {
      return NextResponse.json({ success: false, error: "name is required" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const requestedRecordType = body.recordType
    const recordType =
      requestedRecordType === "portal_person" || requestedRecordType === "legacy"
        ? requestedRecordType
        : "relationship"
    const payload = { ...body, recordType, name, createdAt: now, updatedAt: now }
    const ref = await db.collection("clients").add(payload)

    await writeAuditLog({
      collection: "clients",
      docId: ref.id,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { name },
    })

    return NextResponse.json({ success: true, data: { id: ref.id, ...payload } })
  } catch (err) {
    console.error("POST /api/admin/clients:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
