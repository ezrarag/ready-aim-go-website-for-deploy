// Firestore collection paths must alternate collection/document segments.
// This keeps the requested `ragFleet/vehicles/{vehicleId}` namespace under
// `ragFleet/vehicles/vehicles/{vehicleId}` so the repo can use collection listeners.
export const FLEET_COLLECTION_PATH = ["ragFleet", "vehicles", "vehicles"] as const

export const FLEET_ANGLE_OPTIONS = [
  { value: "01", label: "Front" },
  { value: "13", label: "Side" },
  { value: "21", label: "Rear" },
] as const

export type FleetAngle = (typeof FLEET_ANGLE_OPTIONS)[number]["value"]
export type FleetStatus = "rag" | "want" | "restore"
export type FleetHealthStatus = "good" | "needs-attention" | "critical"

export type FleetVehicle = {
  id: string
  make: string
  model: string
  year: number
  color: string
  config: string
  engine: string
  payload: string
  status: FleetStatus
  statusLabel: string
  priceRange: string
  purpose: string
  notes: string
  vin: string
  licensePlate: string
  healthStatus: FleetHealthStatus
  active: boolean
  createdAt: Date | null
}

export type FleetVehicleInput = Omit<FleetVehicle, "id" | "createdAt">

export type FleetVehicleFormState = {
  make: string
  model: string
  year: string
  color: string
  config: string
  engine: string
  payload: string
  status: FleetStatus
  priceRange: string
  purpose: string
  notes: string
  vin: string
  licensePlate: string
  healthStatus: FleetHealthStatus
}

export const FLEET_STATUS_OPTIONS: Array<{
  value: FleetStatus
  label: string
  shortLabel: string
  filterLabel: string
  cardClassName: string
  pillClassName: string
}> = [
  {
    value: "rag",
    label: "RAG Fleet",
    shortLabel: "RAG Fleet",
    filterLabel: "RAG Fleet",
    cardClassName: "border-emerald-500/40 bg-emerald-500/12 text-emerald-100",
    pillClassName: "border-emerald-400/40 bg-emerald-500/18 text-emerald-100",
  },
  {
    value: "want",
    label: "Wishlist",
    shortLabel: "Wishlist",
    filterLabel: "Wishlist",
    cardClassName: "border-amber-500/40 bg-amber-500/12 text-amber-100",
    pillClassName: "border-amber-400/40 bg-amber-500/18 text-amber-100",
  },
  {
    value: "restore",
    label: "Restore Project",
    shortLabel: "Restore",
    filterLabel: "Restore Project",
    cardClassName: "border-sky-500/40 bg-sky-500/12 text-sky-100",
    pillClassName: "border-sky-400/40 bg-sky-500/18 text-sky-100",
  },
]

export const FLEET_HEALTH_OPTIONS: Array<{
  value: FleetHealthStatus
  label: string
  className: string
}> = [
  {
    value: "good",
    label: "Good",
    className: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "needs-attention",
    label: "Needs Attention",
    className: "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  {
    value: "critical",
    label: "Critical",
    className: "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
]

export const INITIAL_FLEET_FORM_STATE: FleetVehicleFormState = {
  make: "",
  model: "",
  year: "",
  color: "",
  config: "",
  engine: "",
  payload: "",
  status: "rag",
  priceRange: "",
  purpose: "",
  notes: "",
  vin: "",
  licensePlate: "",
  healthStatus: "good",
}

const FLEET_STATUS_ORDER: Record<FleetStatus, number> = {
  rag: 0,
  want: 1,
  restore: 2,
}

const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback)

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

const asBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback

const asStatus = (value: unknown): FleetStatus =>
  value === "rag" || value === "want" || value === "restore" ? value : "want"

const asHealthStatus = (value: unknown): FleetHealthStatus =>
  value === "good" || value === "needs-attention" || value === "critical" ? value : "good"

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

export function getFleetStatusMeta(status: FleetStatus) {
  return FLEET_STATUS_OPTIONS.find((option) => option.value === status) ?? FLEET_STATUS_OPTIONS[1]
}

export function getFleetHealthMeta(status: FleetHealthStatus) {
  return FLEET_HEALTH_OPTIONS.find((option) => option.value === status) ?? FLEET_HEALTH_OPTIONS[0]
}

export function getFleetStatusLabel(status: FleetStatus) {
  return getFleetStatusMeta(status).label
}

export function buildImaginUrl(
  make: string,
  model: string,
  year: number | string,
  angle: FleetAngle = "01"
) {
  const params = new URLSearchParams({
    customer: process.env.NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY ?? "img",
    make: make.toLowerCase().replace(/[\s\-/]/g, ""),
    modelFamily: model.toLowerCase().trim().split(/\s+/)[0] ?? "",
    modelYear: String(year),
    zoomType: "fullscreen",
    angle,
  })

  return `https://cdn.imagin.studio/getimage?${params}`
}

export function normalizeFleetVehicle(id: string, raw: Record<string, unknown>): FleetVehicle {
  const status = asStatus(raw.status)

  return {
    id: asString(raw.id, id) || id,
    make: asString(raw.make),
    model: asString(raw.model),
    year: asNumber(raw.year),
    color: asString(raw.color),
    config: asString(raw.config),
    engine: asString(raw.engine),
    payload: asString(raw.payload),
    status,
    statusLabel: asString(raw.statusLabel, getFleetStatusLabel(status)),
    priceRange: asString(raw.priceRange),
    purpose: asString(raw.purpose),
    notes: asString(raw.notes),
    vin: asString(raw.vin),
    licensePlate: asString(raw.licensePlate),
    healthStatus: asHealthStatus(raw.healthStatus),
    active: asBoolean(raw.active, true),
    createdAt: asDate(raw.createdAt),
  }
}

export function buildFleetPayload(form: FleetVehicleFormState): FleetVehicleInput {
  const status = form.status

  return {
    make: form.make.trim(),
    model: form.model.trim(),
    year: Number(form.year),
    color: form.color.trim(),
    config: form.config.trim(),
    engine: form.engine.trim(),
    payload: form.payload.trim(),
    status,
    statusLabel: getFleetStatusLabel(status),
    priceRange: form.priceRange.trim(),
    purpose: form.purpose.trim(),
    notes: form.notes.trim(),
    vin: form.vin.trim(),
    licensePlate: form.licensePlate.trim(),
    healthStatus: form.healthStatus,
    active: true,
  }
}

export function getFleetFormState(vehicle?: FleetVehicle | null): FleetVehicleFormState {
  if (!vehicle) {
    return INITIAL_FLEET_FORM_STATE
  }

  return {
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year || ""),
    color: vehicle.color,
    config: vehicle.config,
    engine: vehicle.engine,
    payload: vehicle.payload,
    status: vehicle.status,
    priceRange: vehicle.priceRange,
    purpose: vehicle.purpose,
    notes: vehicle.notes,
    vin: vehicle.vin,
    licensePlate: vehicle.licensePlate,
    healthStatus: vehicle.healthStatus,
  }
}

export function sortFleetVehicles(vehicles: FleetVehicle[]) {
  return [...vehicles].sort((left, right) => {
    const statusDelta = FLEET_STATUS_ORDER[left.status] - FLEET_STATUS_ORDER[right.status]
    if (statusDelta !== 0) {
      return statusDelta
    }

    const createdAtDelta = (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0)
    if (createdAtDelta !== 0) {
      return createdAtDelta
    }

    const yearDelta = right.year - left.year
    if (yearDelta !== 0) {
      return yearDelta
    }

    return `${left.make} ${left.model}`.localeCompare(`${right.make} ${right.model}`)
  })
}

export const FLEET_SEED_VEHICLES: FleetVehicleInput[] = [
  {
    make: "Ford",
    model: "Transit",
    year: 2024,
    color: "Oxford White",
    config: "High Roof 148\" AWD",
    engine: "3.5L EcoBoost V6",
    payload: "4,640 lbs",
    status: "rag",
    statusLabel: "RAG Fleet",
    priceRange: "$54,000–$62,000",
    purpose:
      "Primary service van for RAG operations. First vehicle in the BEAM maintenance cohort.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "good",
    active: true,
  },
  {
    make: "Ford",
    model: "Transit",
    year: 2024,
    color: "Oxford White",
    config: "High Roof 148\" AWD",
    engine: "3.5L EcoBoost V6",
    payload: "4,640 lbs",
    status: "rag",
    statusLabel: "RAG Fleet",
    priceRange: "$54,000–$62,000",
    purpose: "Backup and overflow capacity paired with primary Transit.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "good",
    active: true,
  },
  {
    make: "Ram",
    model: "ProMaster",
    year: 2024,
    color: "Bright White",
    config: "High Roof 159\" FWD",
    engine: "3.6L Pentastar V6",
    payload: "4,400 lbs",
    status: "rag",
    statusLabel: "RAG Fleet",
    priceRange: "$44,000–$52,000",
    purpose:
      "Lower load floor ideal for heavy equipment. Pairs with Transit for Milwaukee coverage.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "good",
    active: true,
  },
  {
    make: "Ford",
    model: "F-150",
    year: 2024,
    color: "Agate Black",
    config: "SuperCrew 4x4",
    engine: "2.7L EcoBoost V6",
    payload: "2,238 lbs",
    status: "rag",
    statusLabel: "RAG Fleet",
    priceRange: "$42,000–$55,000",
    purpose: "All-weather Milwaukee workhorse for crew transport and towing.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "good",
    active: true,
  },
  {
    make: "Ford",
    model: "E-Transit",
    year: 2025,
    color: "Frozen White",
    config: "High Roof 148\" RWD",
    engine: "Electric — 266hp",
    payload: "3,800 lbs",
    status: "want",
    statusLabel: "Wishlist",
    priceRange: "$52,000–$61,000",
    purpose:
      "BEAM R&D testbed for EV fleet maintenance cohort. Zero-emissions milestone for RAG.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "good",
    active: true,
  },
  {
    make: "Mercedes-Benz",
    model: "Sprinter",
    year: 2025,
    color: "Arctic White",
    config: "High Roof 170\"EXT AWD",
    engine: "2.0L Turbo Diesel",
    payload: "3,550 lbs",
    status: "want",
    statusLabel: "Wishlist",
    priceRange: "$58,000–$75,000",
    purpose:
      "Premium client transport and potential mobile workshop for on-site fleet visits.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "good",
    active: true,
  },
  {
    make: "Chevrolet",
    model: "Silverado 1500",
    year: 2024,
    color: "Summit White",
    config: "Crew Cab 4x4",
    engine: "3.0L Duramax Diesel",
    payload: "2,280 lbs",
    status: "want",
    statusLabel: "Wishlist",
    priceRange: "$42,000–$58,000",
    purpose:
      "Cohort participant truck — connects local auto parts suppliers into the live supply chain.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "good",
    active: true,
  },
  {
    make: "Chevrolet",
    model: "C10",
    year: 1972,
    color: "TBD",
    config: "Stepside bed",
    engine: "LS Swap (target)",
    payload: "Show vehicle",
    status: "restore",
    statusLabel: "Restore Project",
    priceRange: "$8,000–$18,000 (acquire + restore)",
    purpose:
      "RAG's signature BEAM cohort restore project — repainted in RAG livery, displayed at Milwaukee events.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "needs-attention",
    active: true,
  },
  {
    make: "Ford",
    model: "Bronco",
    year: 1985,
    color: "TBD",
    config: "Full-size 4x4",
    engine: "Coyote 5.0 Swap (target)",
    payload: "Portfolio build",
    status: "restore",
    statusLabel: "Restore Project",
    priceRange: "$12,000–$25,000 (acquire + restore)",
    purpose:
      "Portfolio cohort build — modern drivetrain into classic body, R&D testbed for legacy vehicle upgrades.",
    notes: "",
    vin: "",
    licensePlate: "",
    healthStatus: "critical",
    active: true,
  },
]
