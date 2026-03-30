import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirestoreDb } from "@/lib/firestore"
import {
  FLEET_COLLECTION_PATH,
  normalizeFleetVehicle,
  sortFleetVehicles,
  type FleetHealthStatus,
  type FleetStatus,
} from "@/lib/fleet"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

function getFleetCollection(db: FirebaseFirestore.Firestore) {
  return db
    .collection(FLEET_COLLECTION_PATH[0])
    .doc(FLEET_COLLECTION_PATH[1])
    .collection(FLEET_COLLECTION_PATH[2])
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

export async function GET(request: NextRequest) {
  const db = getFirestoreDb()

  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase Admin is not configured for fleet reads.",
      },
      { status: 500 }
    )
  }

  const includeInactive =
    request.nextUrl.searchParams.get("includeInactive") === "true" ||
    request.nextUrl.searchParams.get("includeInactive") === "1"

  const snapshot = await getFleetCollection(db).get()
  const vehicles = sortFleetVehicles(
    snapshot.docs
      .map((documentSnapshot) =>
        normalizeFleetVehicle(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
      )
      .filter((vehicle) => includeInactive || vehicle.active)
  )

  return NextResponse.json({
    success: true,
    vehicles,
  })
}

export async function POST(request: NextRequest) {
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
  const payload = readFleetMutationFields(body)

  if (!payload.make || !payload.model || !payload.year) {
    return NextResponse.json(
      {
        success: false,
        error: "make, model, and year are required.",
      },
      { status: 400 }
    )
  }

  const documentRef = getFleetCollection(db).doc()

  await documentRef.set({
    ...payload,
    active: typeof payload.active === "boolean" ? payload.active : true,
    id: documentRef.id,
    createdAt: FieldValue.serverTimestamp(),
  })

  const createdSnapshot = await documentRef.get()

  return NextResponse.json({
    success: true,
    vehicle: normalizeFleetVehicle(
      createdSnapshot.id,
      (createdSnapshot.data() ?? {}) as Record<string, unknown>
    ),
  })
}
