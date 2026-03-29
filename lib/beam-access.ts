import { getFirestoreDb } from "@/lib/firestore"
import { emailToDocId, generateSlug, type AllowlistEntry } from "@/lib/beam-access-shared"

type AllowlistEntryRecord = Partial<AllowlistEntry> & Record<string, unknown>

const ALLOWLIST_COLLECTION = "ragAllowlist"

function normalizeEntry(docId: string, value: AllowlistEntryRecord): AllowlistEntry {
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : docId.replace(/_/g, ".")
  const clientName = typeof value.clientName === "string" ? value.clientName.trim() : ""
  const derivedSlug = generateSlug(clientName)

  return {
    email,
    clientName,
    clientSlug:
      typeof value.clientSlug === "string" && value.clientSlug.trim().length > 0
        ? value.clientSlug.trim()
        : derivedSlug,
    addedBy: typeof value.addedBy === "string" && value.addedBy.trim().length > 0 ? value.addedBy.trim() : "dashboard-admin",
    addedAt: typeof value.addedAt === "string" && value.addedAt.trim().length > 0 ? value.addedAt.trim() : new Date(0).toISOString(),
    active: typeof value.active === "boolean" ? value.active : false,
    notes: typeof value.notes === "string" ? value.notes : "",
  }
}

export async function listBeamAllowlistEntries(): Promise<AllowlistEntry[]> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error("Firebase Admin is not configured")
  }

  const snapshot = await db.collection(ALLOWLIST_COLLECTION).get()
  return snapshot.docs
    .map((doc) => normalizeEntry(doc.id, doc.data() as AllowlistEntryRecord))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
}

export async function upsertBeamAllowlistEntry(input: {
  email: string
  clientName: string
  clientSlug?: string
  notes?: string
  addedBy: string
}): Promise<AllowlistEntry> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error("Firebase Admin is not configured")
  }

  const email = input.email.trim().toLowerCase()
  const clientName = input.clientName.trim()
  const clientSlug = generateSlug((input.clientSlug ?? "").trim() || clientName)
  const docId = emailToDocId(email)
  const entry: AllowlistEntry = {
    email,
    clientName,
    clientSlug,
    addedBy: input.addedBy.trim() || "dashboard-admin",
    addedAt: new Date().toISOString(),
    active: true,
    notes: input.notes?.trim() ?? "",
  }

  await db.collection(ALLOWLIST_COLLECTION).doc(docId).set(entry, { merge: true })
  return entry
}

export async function setBeamAllowlistEntryActive(docId: string, active: boolean): Promise<AllowlistEntry> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error("Firebase Admin is not configured")
  }

  const ref = db.collection(ALLOWLIST_COLLECTION).doc(docId)
  const snapshot = await ref.get()
  if (!snapshot.exists) {
    throw new Error("Allowlist entry not found")
  }

  await ref.set({ active }, { merge: true })
  const updated = await ref.get()
  return normalizeEntry(updated.id, updated.data() as AllowlistEntryRecord)
}
