import { getFirestoreDb } from "@/lib/firestore"
import {
  RAG_SITE_URL,
  TRANSPORTATION_SITE_URL,
  VEHICLE_COLLECTION,
  normalizeVehicleRecord,
  type VehicleRecord,
} from "@/lib/vehicle-inventory"

type ClientDocSnapshot = {
  id: string
  data: Record<string, unknown>
}

function normalizeUrl(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().replace(/\/+$/, "").toLowerCase()
}

function normalizeHost(value: unknown): string {
  if (typeof value !== "string") return ""

  try {
    return new URL(value).host.toLowerCase()
  } catch {
    return value.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase()
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim())
}

function matchesRagClient(doc: ClientDocSnapshot) {
  const normalizedRagUrl = normalizeUrl(RAG_SITE_URL)
  const ragHost = normalizeHost(RAG_SITE_URL)
  const storyId = typeof doc.data.storyId === "string" ? doc.data.storyId.toLowerCase() : ""
  const name = typeof doc.data.name === "string" ? doc.data.name.toLowerCase() : ""
  const websiteUrl = normalizeUrl(doc.data.websiteUrl)
  const deployUrl = normalizeUrl(doc.data.deployUrl)
  const deployHosts = asStringArray(doc.data.deployHosts).map(normalizeHost)

  return (
    websiteUrl === normalizedRagUrl ||
    deployUrl === normalizedRagUrl ||
    deployHosts.includes(ragHost) ||
    storyId === "v0-ready-aim-go-website" ||
    name.includes("readyaimgo")
  )
}

function matchesTransportationClient(doc: ClientDocSnapshot) {
  const normalizedTransportationUrl = normalizeUrl(TRANSPORTATION_SITE_URL)
  const transportationHost = normalizeHost(TRANSPORTATION_SITE_URL)
  const storyId = typeof doc.data.storyId === "string" ? doc.data.storyId.toLowerCase() : ""
  const name = typeof doc.data.name === "string" ? doc.data.name.toLowerCase() : ""
  const websiteUrl = normalizeUrl(doc.data.websiteUrl)
  const deployUrl = normalizeUrl(doc.data.deployUrl)
  const transportationUrl = normalizeUrl(doc.data.transportationUrl)
  const deployHosts = asStringArray(doc.data.deployHosts).map(normalizeHost)

  return (
    transportationUrl === normalizedTransportationUrl ||
    websiteUrl === normalizedTransportationUrl ||
    deployUrl === normalizedTransportationUrl ||
    deployHosts.includes(transportationHost) ||
    storyId.includes("transportation") ||
    name.includes("transportation")
  )
}

async function getAllClientDocs(): Promise<ClientDocSnapshot[]> {
  const db = getFirestoreDb()
  if (!db) return []

  const snapshot = await db.collection("clients").get()
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as Record<string, unknown>,
  }))
}

export async function resolveVehicleLinkTargets() {
  const clients = await getAllClientDocs()

  return {
    ragClient: clients.find(matchesRagClient) ?? null,
    transportationClient: clients.find(matchesTransportationClient) ?? null,
  }
}

export async function getVehicleById(vehicleId: string): Promise<VehicleRecord | null> {
  const db = getFirestoreDb()
  if (!db) return null

  const snapshot = await db.collection(VEHICLE_COLLECTION).doc(vehicleId).get()
  if (!snapshot.exists) return null

  return normalizeVehicleRecord(
    snapshot.id,
    (snapshot.data() ?? {}) as Record<string, unknown>
  )
}
