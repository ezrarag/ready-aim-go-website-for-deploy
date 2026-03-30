export const VEHICLE_COLLECTION = "vehicles" as const

export const TRANSPORTATION_SITE_URL = "https://transportation.beamthinktank.space"
export const RAG_SITE_URL = "https://readyaimgo.biz"

export const VEHICLE_STATUS_OPTIONS = [
  { value: "intake", label: "In Intake" },
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
] as const

export type VehicleStatus = (typeof VEHICLE_STATUS_OPTIONS)[number]["value"]

export type VehiclePhoto = {
  name: string
  publicUrl: string
  storagePath: string
  contentType: string
}

export type VehicleRecord = {
  id: string
  vin: string
  make: string
  model: string
  year: number | null
  vehicleType: string
  fuelType: string
  bodyClass: string
  gvwr: string
  licensePlate: string
  city: string
  assignedCity: string
  currentMileage: number | null
  purchasePrice: number | null
  status: VehicleStatus
  photos: VehiclePhoto[]
  createdAt: Date | null
  updatedAt: Date | null
}

export type VehicleIntakeFormState = {
  vin: string
  make: string
  model: string
  year: string
  vehicleType: string
  fuelType: string
  bodyClass: string
  gvwr: string
  licensePlate: string
  city: string
  assignedCity: string
  currentMileage: string
  purchasePrice: string
  status: VehicleStatus
}

export type DecodedVinVehicle = Pick<
  VehicleRecord,
  "make" | "model" | "year" | "vehicleType" | "fuelType" | "bodyClass" | "gvwr"
>

export const INITIAL_VEHICLE_INTAKE_FORM: VehicleIntakeFormState = {
  vin: "",
  make: "",
  model: "",
  year: "",
  vehicleType: "",
  fuelType: "",
  bodyClass: "",
  gvwr: "",
  licensePlate: "",
  city: "",
  assignedCity: "",
  currentMileage: "",
  purchasePrice: "",
  status: "intake",
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate()
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function asVehicleStatus(value: unknown): VehicleStatus {
  return VEHICLE_STATUS_OPTIONS.some((option) => option.value === value)
    ? (value as VehicleStatus)
    : "intake"
}

function asVehiclePhotos(value: unknown): VehiclePhoto[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((photo): photo is Record<string, unknown> => Boolean(photo && typeof photo === "object"))
    .map((photo) => ({
      name: asString(photo.name),
      publicUrl: asString(photo.publicUrl),
      storagePath: asString(photo.storagePath),
      contentType: asString(photo.contentType),
    }))
    .filter((photo) => Boolean(photo.publicUrl && photo.storagePath))
}

export function sanitizeVin(value: string) {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17)
}

export function formatCurrencyInput(value: string) {
  const trimmed = value.trim().replace(/[$,]/g, "")
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeVehicleRecord(
  id: string,
  raw: Record<string, unknown>
): VehicleRecord {
  return {
    id: asString(raw.id, id) || id,
    vin: asString(raw.vin),
    make: asString(raw.make),
    model: asString(raw.model),
    year: asNumberOrNull(raw.year),
    vehicleType: asString(raw.vehicleType),
    fuelType: asString(raw.fuelType),
    bodyClass: asString(raw.bodyClass),
    gvwr: asString(raw.gvwr),
    licensePlate: asString(raw.licensePlate),
    city: asString(raw.city),
    assignedCity: asString(raw.assignedCity),
    currentMileage: asNumberOrNull(raw.currentMileage),
    purchasePrice: asNumberOrNull(raw.purchasePrice),
    status: asVehicleStatus(raw.status),
    photos: asVehiclePhotos(raw.photos),
    createdAt: asDate(raw.createdAt),
    updatedAt: asDate(raw.updatedAt),
  }
}
