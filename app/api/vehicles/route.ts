import path from "node:path"
import { FieldValue } from "firebase-admin/firestore"
import { NextRequest, NextResponse } from "next/server"
import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { resolveVehicleLinkTargets } from "@/lib/vehicle-admin"
import {
  VEHICLE_COLLECTION,
  VEHICLE_STATUS_OPTIONS,
  normalizeVehicleRecord,
  sanitizeVin,
  type VehiclePhoto,
  type VehicleStatus,
} from "@/lib/vehicle-inventory"

export const dynamic = "force-dynamic"

function asString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(/[$,]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function asVehicleStatus(value: string): VehicleStatus {
  return VEHICLE_STATUS_OPTIONS.some((option) => option.value === value)
    ? (value as VehicleStatus)
    : "intake"
}

function sanitizeFileName(fileName: string, index: number) {
  const extension = path.extname(fileName).toLowerCase() || ".jpg"
  const baseName = path
    .basename(fileName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${String(index + 1).padStart(2, "0")}-${baseName || "photo"}${extension}`
}

async function uploadVehiclePhotos(
  vehicleId: string,
  files: File[]
): Promise<VehiclePhoto[]> {
  const bucket = getStorageBucket()
  if (!bucket) {
    throw new Error("Storage not configured.")
  }

  return Promise.all(
    files.map(async (file, index) => {
      const fileName = sanitizeFileName(file.name || `photo-${index + 1}.jpg`, index)
      const storagePath = `vehicles/${vehicleId}/photos/${fileName}`
      const bucketFile = bucket.file(storagePath)
      const buffer = Buffer.from(await file.arrayBuffer())

      await bucketFile.save(buffer, {
        metadata: {
          contentType: file.type || "application/octet-stream",
        },
      })

      await bucketFile.makePublic()

      return {
        name: file.name || fileName,
        publicUrl: `https://storage.googleapis.com/${bucket.name}/${storagePath}`,
        storagePath,
        contentType: file.type || "application/octet-stream",
      }
    })
  )
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Firebase Admin is not configured for vehicle writes." },
      { status: 500 }
    )
  }

  const { ragClient, transportationClient } = await resolveVehicleLinkTargets()

  if (!ragClient) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not resolve the ReadyAimGo client record for fleetVehicleIds linking.",
      },
      { status: 409 }
    )
  }

  if (!transportationClient) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Could not resolve the BEAM transportation client record for assignedVehicles linking.",
      },
      { status: 409 }
    )
  }

  const formData = await request.formData()
  const vin = sanitizeVin(asString(formData, "vin"))
  const make = asString(formData, "make")
  const model = asString(formData, "model")
  const year = asNumber(asString(formData, "year"))

  if (vin.length !== 17) {
    return NextResponse.json(
      { success: false, error: "VIN must be 17 characters." },
      { status: 400 }
    )
  }

  if (!make || !model || year === null) {
    return NextResponse.json(
      { success: false, error: "VIN lookup details are incomplete. Make, model, and year are required." },
      { status: 400 }
    )
  }

  const photoFiles = formData
    .getAll("photos")
    .filter((file): file is File => typeof File !== "undefined" && file instanceof File)

  const vehicleRef = db.collection(VEHICLE_COLLECTION).doc()
  const photos = await uploadVehiclePhotos(vehicleRef.id, photoFiles)

  const vehicleRecord = {
    id: vehicleRef.id,
    vin,
    make,
    model,
    year,
    vehicleType: asString(formData, "vehicleType"),
    fuelType: asString(formData, "fuelType"),
    bodyClass: asString(formData, "bodyClass"),
    gvwr: asString(formData, "gvwr"),
    licensePlate: asString(formData, "licensePlate"),
    city: asString(formData, "city"),
    assignedCity: asString(formData, "assignedCity"),
    currentMileage: asNumber(asString(formData, "currentMileage")),
    purchasePrice: asNumber(asString(formData, "purchasePrice")),
    status: asVehicleStatus(asString(formData, "status")),
    photos,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  const batch = db.batch()
  batch.set(vehicleRef, vehicleRecord)

  const clientUpdates = new Map<
    string,
    FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>
  >()
  clientUpdates.set(ragClient.id, {
    fleetVehicleIds: FieldValue.arrayUnion(vehicleRef.id),
    updatedAt: new Date().toISOString(),
  })

  const transportationExisting = clientUpdates.get(transportationClient.id) ?? {}
  clientUpdates.set(transportationClient.id, {
    ...transportationExisting,
    assignedVehicles: FieldValue.arrayUnion(vehicleRef.id),
    updatedAt: new Date().toISOString(),
  })

  for (const [clientId, update] of clientUpdates) {
    batch.update(db.collection("clients").doc(clientId), update)
  }

  await batch.commit()

  const createdSnapshot = await vehicleRef.get()

  return NextResponse.json({
    success: true,
    vehicle: normalizeVehicleRecord(
      createdSnapshot.id,
      (createdSnapshot.data() ?? {}) as Record<string, unknown>
    ),
    links: {
      ragClientId: ragClient.id,
      transportationClientId: transportationClient.id,
    },
  })
}
