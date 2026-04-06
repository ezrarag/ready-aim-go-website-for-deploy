import type {
  RAGProperty,
  RAGPropertyClass,
  RAGPropertyNGOLink,
  RAGPropertyStatus,
} from "@/types/ragProperty"

export const RAG_PROPERTIES_COLLECTION = "ragProperties" as const

export const RAG_PROPERTY_CLASS_OPTIONS: Array<{
  value: RAGPropertyClass
  label: string
  shortLabel: string
  cardClassName: string
  pillClassName: string
  placeholderClassName: string
}> = [
  {
    value: "commercial-space",
    label: "Commercial Space",
    shortLabel: "Commercial",
    cardClassName: "border-cyan-500/30 bg-cyan-500/12 text-cyan-100",
    pillClassName: "border-cyan-400/35 bg-cyan-500/16 text-cyan-100",
    placeholderClassName:
      "bg-[linear-gradient(135deg,rgba(13,148,136,0.9),rgba(8,47,73,0.92))]",
  },
  {
    value: "hotel-established",
    label: "Hotel Established",
    shortLabel: "Operating Hotel",
    cardClassName: "border-emerald-500/30 bg-emerald-500/12 text-emerald-100",
    pillClassName: "border-emerald-400/35 bg-emerald-500/16 text-emerald-100",
    placeholderClassName:
      "bg-[linear-gradient(135deg,rgba(5,150,105,0.92),rgba(6,78,59,0.96))]",
  },
  {
    value: "hotel-remake",
    label: "Hotel Remake",
    shortLabel: "Hotel Remake",
    cardClassName: "border-amber-500/30 bg-amber-500/12 text-amber-100",
    pillClassName: "border-amber-400/35 bg-amber-500/16 text-amber-100",
    placeholderClassName:
      "bg-[linear-gradient(135deg,rgba(217,119,6,0.94),rgba(120,53,15,0.98))]",
  },
  {
    value: "mixed-use-civic",
    label: "Mixed-Use Civic",
    shortLabel: "Mixed-Use Civic",
    cardClassName: "border-violet-500/30 bg-violet-500/12 text-violet-100",
    pillClassName: "border-violet-400/35 bg-violet-500/16 text-violet-100",
    placeholderClassName:
      "bg-[linear-gradient(135deg,rgba(109,40,217,0.9),rgba(49,46,129,0.95))]",
  },
  {
    value: "distressed",
    label: "Distressed",
    shortLabel: "Distressed",
    cardClassName: "border-rose-500/30 bg-rose-500/12 text-rose-100",
    pillClassName: "border-rose-400/35 bg-rose-500/16 text-rose-100",
    placeholderClassName:
      "bg-[linear-gradient(135deg,rgba(225,29,72,0.92),rgba(76,5,25,0.96))]",
  },
  {
    value: "residential-portfolio",
    label: "Residential Portfolio",
    shortLabel: "Residential",
    cardClassName: "border-sky-500/30 bg-sky-500/12 text-sky-100",
    pillClassName: "border-sky-400/35 bg-sky-500/16 text-sky-100",
    placeholderClassName:
      "bg-[linear-gradient(135deg,rgba(14,165,233,0.88),rgba(30,64,175,0.94))]",
  },
]

export const RAG_PROPERTY_STATUS_OPTIONS: Array<{
  value: RAGPropertyStatus
  label: string
  shortLabel: string
  cardClassName: string
  pillClassName: string
}> = [
  {
    value: "prospecting",
    label: "Prospecting",
    shortLabel: "Prospecting",
    cardClassName: "border-slate-500/30 bg-slate-500/12 text-slate-100",
    pillClassName: "border-slate-300/25 bg-slate-500/16 text-slate-100",
  },
  {
    value: "under-contract",
    label: "Under Contract",
    shortLabel: "Under Contract",
    cardClassName: "border-orange-500/30 bg-orange-500/12 text-orange-100",
    pillClassName: "border-orange-400/35 bg-orange-500/16 text-orange-100",
  },
  {
    value: "active",
    label: "Active",
    shortLabel: "Active",
    cardClassName: "border-emerald-500/30 bg-emerald-500/12 text-emerald-100",
    pillClassName: "border-emerald-400/35 bg-emerald-500/16 text-emerald-100",
  },
  {
    value: "in-renovation",
    label: "In Renovation",
    shortLabel: "Renovation",
    cardClassName: "border-amber-500/30 bg-amber-500/12 text-amber-100",
    pillClassName: "border-amber-400/35 bg-amber-500/16 text-amber-100",
  },
  {
    value: "stabilized",
    label: "Stabilized",
    shortLabel: "Stabilized",
    cardClassName: "border-cyan-500/30 bg-cyan-500/12 text-cyan-100",
    pillClassName: "border-cyan-400/35 bg-cyan-500/16 text-cyan-100",
  },
  {
    value: "exited",
    label: "Exited",
    shortLabel: "Exited",
    cardClassName: "border-zinc-500/30 bg-zinc-500/12 text-zinc-100",
    pillClassName: "border-zinc-300/25 bg-zinc-500/16 text-zinc-100",
  },
]

export type RAGPropertyFormState = {
  name: string
  address: string
  city: string
  state: string
  zip: string
  lat: string
  lng: string
  propertyClass: RAGPropertyClass
  status: RAGPropertyStatus
  node: string
  clientId: string
  clientName: string
  beamGroundsPropertyId: string
  publicName: string
  publicSummary: string
  publicImageUrl: string
  isPublic: boolean
  roomCount: string
  starRating: string
  brandAffiliation: string
  renovationBudget: string
  targetCompletion: string
  notes: string
  squareFootage: string
  purchasePrice: string
  currentValue: string
  ngoLinks: RAGPropertyNGOLink[]
}

export type RAGPropertySummary = {
  total: number
  active: number
  inRenovation: number
  beamLinked: number
}

export const INITIAL_RAG_PROPERTY_FORM_STATE: RAGPropertyFormState = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  lat: "",
  lng: "",
  propertyClass: "commercial-space",
  status: "prospecting",
  node: "",
  clientId: "",
  clientName: "",
  beamGroundsPropertyId: "",
  publicName: "",
  publicSummary: "",
  publicImageUrl: "",
  isPublic: false,
  roomCount: "",
  starRating: "",
  brandAffiliation: "",
  renovationBudget: "",
  targetCompletion: "",
  notes: "",
  squareFootage: "",
  purchasePrice: "",
  currentValue: "",
  ngoLinks: [],
}

const PROPERTY_STATUS_ORDER: Record<RAGPropertyStatus, number> = {
  active: 0,
  stabilized: 1,
  "in-renovation": 2,
  "under-contract": 3,
  prospecting: 4,
  exited: 5,
}

const NGO_RELATIONSHIP_TYPES = new Set<RAGPropertyNGOLink["relationshipType"]>([
  "anchor-site",
  "service-site",
  "cohort-project",
  "training-site",
])

const PROPERTY_CLASSES = new Set<RAGPropertyClass>(
  RAG_PROPERTY_CLASS_OPTIONS.map((option) => option.value)
)

const PROPERTY_STATUSES = new Set<RAGPropertyStatus>(
  RAG_PROPERTY_STATUS_OPTIONS.map((option) => option.value)
)

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asStringOrUndefined(value: unknown): string | undefined {
  const result = asString(value).trim()
  return result || undefined
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function asNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const trimmed = value.trim().replace(/[$,]/g, "")
    if (!trimmed) {
      return undefined
    }
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function asTimestampString(value: unknown): string {
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return new Date(0).toISOString()
}

function asPropertyClass(value: unknown): RAGPropertyClass {
  return PROPERTY_CLASSES.has(value as RAGPropertyClass)
    ? (value as RAGPropertyClass)
    : "commercial-space"
}

function asPropertyStatus(value: unknown): RAGPropertyStatus {
  return PROPERTY_STATUSES.has(value as RAGPropertyStatus)
    ? (value as RAGPropertyStatus)
    : "prospecting"
}

function normalizeNGOLink(raw: unknown): RAGPropertyNGOLink | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null
  }

  const link = raw as Record<string, unknown>
  const relationshipType = link.relationshipType

  if (!NGO_RELATIONSHIP_TYPES.has(relationshipType as RAGPropertyNGOLink["relationshipType"])) {
    return null
  }

  const ngoId = asString(link.ngoId).trim()
  const ngoName = asString(link.ngoName).trim()
  const ngoSubdomain = asString(link.ngoSubdomain).trim()

  if (!ngoId || !ngoName || !ngoSubdomain) {
    return null
  }

  return {
    ngoId,
    ngoName,
    ngoSubdomain,
    relationshipType: relationshipType as RAGPropertyNGOLink["relationshipType"],
    linkedAt: asTimestampString(link.linkedAt),
    linkedBy: asString(link.linkedBy).trim() || "unknown",
  }
}

function asNGOLinks(value: unknown): RAGPropertyNGOLink[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((link) => normalizeNGOLink(link))
    .filter((link): link is RAGPropertyNGOLink => Boolean(link))
}

function asHotelDetails(value: unknown): RAGProperty["hotelDetails"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  const details = value as Record<string, unknown>
  const roomCount = asNumberOrUndefined(details.roomCount)
  const starRating = asNumberOrUndefined(details.starRating)
  const brandAffiliation = asStringOrUndefined(details.brandAffiliation)
  const renovationBudget = asNumberOrUndefined(details.renovationBudget)
  const targetCompletion = asStringOrUndefined(details.targetCompletion)

  if (
    roomCount === undefined &&
    starRating === undefined &&
    !brandAffiliation &&
    renovationBudget === undefined &&
    !targetCompletion
  ) {
    return undefined
  }

  return {
    roomCount,
    starRating,
    brandAffiliation,
    renovationBudget,
    targetCompletion,
  }
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed || undefined
}

export function getPropertyClassMeta(propertyClass: RAGPropertyClass) {
  return (
    RAG_PROPERTY_CLASS_OPTIONS.find((option) => option.value === propertyClass) ??
    RAG_PROPERTY_CLASS_OPTIONS[0]
  )
}

export function getPropertyStatusMeta(status: RAGPropertyStatus) {
  return (
    RAG_PROPERTY_STATUS_OPTIONS.find((option) => option.value === status) ??
    RAG_PROPERTY_STATUS_OPTIONS[0]
  )
}

export function isHotelProperty(propertyClass: RAGPropertyClass) {
  return propertyClass === "hotel-established" || propertyClass === "hotel-remake"
}

export function propertyIsBeamLinked(property: Pick<RAGProperty, "ngoLinks">) {
  return property.ngoLinks.length > 0
}

export function propertyHasGroundsLink(property: Pick<RAGProperty, "ngoLinks">) {
  return property.ngoLinks.some((link) => link.ngoId.trim().toLowerCase() === "grounds")
}

export function formatPropertyAddress(property: Pick<RAGProperty, "address" | "city" | "state" | "zip">) {
  return `${property.address}, ${property.city}, ${property.state} ${property.zip}`
}

export function normalizeRAGProperty(id: string, raw: Record<string, unknown>): RAGProperty {
  const propertyClass = asPropertyClass(raw.propertyClass)
  const status = asPropertyStatus(raw.status)

  return {
    id: asString(raw.id, id) || id,
    name: asString(raw.name),
    address: asString(raw.address),
    city: asString(raw.city),
    state: asString(raw.state),
    zip: asString(raw.zip),
    lat: asNumber(raw.lat),
    lng: asNumber(raw.lng),
    propertyClass,
    status,
    node: asString(raw.node),
    clientId: asStringOrUndefined(raw.clientId),
    clientName: asStringOrUndefined(raw.clientName),
    ngoLinks: asNGOLinks(raw.ngoLinks),
    beamGroundsPropertyId: asStringOrUndefined(raw.beamGroundsPropertyId),
    publicName: asString(raw.publicName),
    publicSummary: asString(raw.publicSummary),
    publicImageUrl: asStringOrUndefined(raw.publicImageUrl),
    isPublic: asBoolean(raw.isPublic),
    hotelDetails: asHotelDetails(raw.hotelDetails),
    notes: asStringOrUndefined(raw.notes),
    squareFootage: asNumberOrUndefined(raw.squareFootage),
    purchasePrice: asNumberOrUndefined(raw.purchasePrice),
    currentValue: asNumberOrUndefined(raw.currentValue),
    createdAt: asTimestampString(raw.createdAt),
    updatedAt: asTimestampString(raw.updatedAt),
    createdBy: asString(raw.createdBy) || "unknown",
  }
}

export function getRAGPropertyFormState(property?: RAGProperty | null): RAGPropertyFormState {
  if (!property) {
    return INITIAL_RAG_PROPERTY_FORM_STATE
  }

  return {
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zip,
    lat: String(property.lat || ""),
    lng: String(property.lng || ""),
    propertyClass: property.propertyClass,
    status: property.status,
    node: property.node,
    clientId: property.clientId || "",
    clientName: property.clientName || "",
    beamGroundsPropertyId: property.beamGroundsPropertyId || "",
    publicName: property.publicName,
    publicSummary: property.publicSummary,
    publicImageUrl: property.publicImageUrl || "",
    isPublic: property.isPublic,
    roomCount: property.hotelDetails?.roomCount ? String(property.hotelDetails.roomCount) : "",
    starRating: property.hotelDetails?.starRating ? String(property.hotelDetails.starRating) : "",
    brandAffiliation: property.hotelDetails?.brandAffiliation || "",
    renovationBudget: property.hotelDetails?.renovationBudget
      ? String(property.hotelDetails.renovationBudget)
      : "",
    targetCompletion: property.hotelDetails?.targetCompletion || "",
    notes: property.notes || "",
    squareFootage: property.squareFootage ? String(property.squareFootage) : "",
    purchasePrice: property.purchasePrice ? String(property.purchasePrice) : "",
    currentValue: property.currentValue ? String(property.currentValue) : "",
    ngoLinks: property.ngoLinks,
  }
}

export function buildRAGPropertyPayload(form: RAGPropertyFormState, createdBy: string) {
  const payload = {
    name: form.name.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    zip: form.zip.trim(),
    lat: Number(form.lat),
    lng: Number(form.lng),
    propertyClass: form.propertyClass,
    status: form.status,
    node: form.node.trim(),
    clientId: trimOrUndefined(form.clientId) ?? null,
    clientName: trimOrUndefined(form.clientName) ?? null,
    ngoLinks: form.ngoLinks,
    beamGroundsPropertyId: trimOrUndefined(form.beamGroundsPropertyId) ?? null,
    publicName: form.publicName.trim(),
    publicSummary: form.publicSummary.trim(),
    publicImageUrl: trimOrUndefined(form.publicImageUrl) ?? null,
    isPublic: form.isPublic,
    hotelDetails: null as RAGProperty["hotelDetails"] | null,
    notes: trimOrUndefined(form.notes) ?? null,
    squareFootage: asNumberOrUndefined(form.squareFootage) ?? null,
    purchasePrice: asNumberOrUndefined(form.purchasePrice) ?? null,
    currentValue: asNumberOrUndefined(form.currentValue) ?? null,
    createdBy: createdBy.trim() || "unknown",
  }

  if (isHotelProperty(form.propertyClass)) {
    const hotelDetails = asHotelDetails({
      roomCount: asNumberOrUndefined(form.roomCount),
      starRating: asNumberOrUndefined(form.starRating),
      brandAffiliation: trimOrUndefined(form.brandAffiliation),
      renovationBudget: asNumberOrUndefined(form.renovationBudget),
      targetCompletion: trimOrUndefined(form.targetCompletion),
    })

    if (hotelDetails) {
      payload.hotelDetails = hotelDetails
    }
  }

  return payload
}

export function readRAGPropertyMutationFields(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}

  const stringFields = [
    "name",
    "address",
    "city",
    "state",
    "zip",
    "node",
    "publicName",
    "publicSummary",
    "createdBy",
  ] as const

  for (const key of stringFields) {
    const value = body[key]
    if (typeof value === "string") {
      patch[key] = value.trim()
    }
  }

  const nullableStringFields = [
    "clientId",
    "clientName",
    "beamGroundsPropertyId",
    "publicImageUrl",
    "notes",
  ] as const

  for (const key of nullableStringFields) {
    const value = body[key]
    if (typeof value === "string") {
      patch[key] = value.trim() || null
    } else if (value === null) {
      patch[key] = null
    }
  }

  if (typeof body.lat === "number" && Number.isFinite(body.lat)) {
    patch.lat = body.lat
  }

  if (typeof body.lng === "number" && Number.isFinite(body.lng)) {
    patch.lng = body.lng
  }

  const nullableNumberFields = ["squareFootage", "purchasePrice", "currentValue"] as const

  for (const key of nullableNumberFields) {
    const value = body[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      patch[key] = value
    } else if (value === null) {
      patch[key] = null
    }
  }

  if (PROPERTY_CLASSES.has(body.propertyClass as RAGPropertyClass)) {
    patch.propertyClass = body.propertyClass
  }

  if (PROPERTY_STATUSES.has(body.status as RAGPropertyStatus)) {
    patch.status = body.status
  }

  if (typeof body.isPublic === "boolean") {
    patch.isPublic = body.isPublic
  }

  if (Array.isArray(body.ngoLinks)) {
    patch.ngoLinks = body.ngoLinks
      .map((link) => normalizeNGOLink(link))
      .filter((link): link is RAGPropertyNGOLink => Boolean(link))
  }

  if (body.hotelDetails === null) {
    patch.hotelDetails = null
  } else if (body.hotelDetails && typeof body.hotelDetails === "object" && !Array.isArray(body.hotelDetails)) {
    patch.hotelDetails = asHotelDetails(body.hotelDetails) ?? null
  }

  return patch
}

export function computeRAGPropertySummary(properties: RAGProperty[]): RAGPropertySummary {
  return {
    total: properties.length,
    active: properties.filter((property) => property.status === "active").length,
    inRenovation: properties.filter((property) => property.status === "in-renovation").length,
    beamLinked: properties.filter((property) => property.ngoLinks.length > 0).length,
  }
}

export function sortRAGProperties(properties: RAGProperty[]) {
  return [...properties].sort((left, right) => {
    const statusDelta = PROPERTY_STATUS_ORDER[left.status] - PROPERTY_STATUS_ORDER[right.status]
    if (statusDelta !== 0) {
      return statusDelta
    }

    const updatedAtDelta =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    if (updatedAtDelta !== 0) {
      return updatedAtDelta
    }

    return left.publicName.localeCompare(right.publicName)
  })
}
