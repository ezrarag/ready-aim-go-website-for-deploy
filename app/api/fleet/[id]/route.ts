import { NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { FLEET_COLLECTION_PATH, normalizeFleetVehicle, type FleetHealthStatus, type FleetStatus } from "@/lib/fleet"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

function getFleetDocument(db: FirebaseFirestore.Firestore, id: string) {
  return db
    .collection(FLEET_COLLECTION_PATH[0])
    .doc(FLEET_COLLECTION_PATH[1])
    .collection(FLEET_COLLECTION_PATH[2])
    .doc(id)
}

function readFleetMutationFields(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}

  const stringFields = [
    "make",
    "model",
    "color",
    "config",
    "engine",
    "payload",
    "priceRange",
    "purpose",
    "notes",
    "vin",
    "licensePlate",
    "statusLabel",
  ] as const

  for (const key of stringFields) {
    const value = body[key]
    if (typeof value === "string") {
      patch[key] = value.trim()
    }
  }

  if (typeof body.year === "number" && Number.isFinite(body.year)) {
    patch.year = body.year
  }

  if (body.status === "rag" || body.status === "want" || body.status === "restore") {
    patch.status = body.status as FleetStatus
  }

  if (
    body.healthStatus === "good" ||
    body.healthStatus === "needs-attention" ||
    body.healthStatus === "critical"
  ) {
    patch.healthStatus = body.healthStatus as FleetHealthStatus
  }

  if (typeof body.active === "boolean") {
    patch.active = body.active
  }

  return patch
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = getFirestoreDb()

  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase Admin is not configured for fleet writes.",
      },
      { status: 500 }
    )
  }

  const rawBody: unknown = await request.json()
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid fleet payload.",
      },
      { status: 400 }
    )
  }

  const body = rawBody as Record<string, unknown>
  const patch = readFleetMutationFields(body)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No valid fleet fields were provided.",
      },
      { status: 400 }
    )
  }

  const params = await context.params
  const documentRef = getFleetDocument(db, params.id)
  await documentRef.update(patch)

  const updatedSnapshot = await documentRef.get()

  return NextResponse.json({
    success: true,
    vehicle: normalizeFleetVehicle(
      updatedSnapshot.id,
      (updatedSnapshot.data() ?? {}) as Record<string, unknown>
    ),
  })
}
