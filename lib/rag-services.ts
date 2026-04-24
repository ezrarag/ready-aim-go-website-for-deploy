export const RAG_SERVICES_COLLECTION = "services"

export const RAG_SERVICE_CATEGORY_OPTIONS = [
  "AI & Automation",
  "Comms & Alerts",
  "Data & Identity",
  "Finance & Payments",
  "Hosting & Delivery",
] as const

export type RAGServiceCategory = (typeof RAG_SERVICE_CATEGORY_OPTIONS)[number]

export type RAGServiceStatus = "active" | "due-soon" | "overdue"

export type RAGService = {
  id: string
  name: string
  vendor: string
  category: RAGServiceCategory
  monthlyCost: number
  nextDueDate: string
  receiptUrl?: string
  notes?: string
  dependentProjects: string[]
  createdAt?: string
  updatedAt?: string
}

type RAGServiceSeedInput = Omit<RAGService, "id" | "createdAt" | "updatedAt">

const CATEGORY_SET = new Set<string>(RAG_SERVICE_CATEGORY_OPTIONS)

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []

function formatDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const parsed = new Date(year, monthIndex, day)

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

function asDateOnlyString(value: unknown): string {
  if (typeof value === "string") {
    const direct = parseDateOnly(value)
    if (direct) {
      return formatDateOnly(direct)
    }

    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateOnly(parsed)
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateOnly(value)
  }

  if (value && typeof value === "object" && "toDate" in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate()
      if (!Number.isNaN(date.getTime())) {
        return formatDateOnly(date)
      }
    } catch {
      return ""
    }
  }

  return ""
}

function asTimestampString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }

  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString()
    } catch {
      return undefined
    }
  }

  return undefined
}

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  next.setDate(next.getDate() + days)
  return next
}

function startOfToday(referenceDate = new Date()) {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
}

function differenceInCalendarDays(date: Date, comparedTo: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const utcCompared = Date.UTC(
    comparedTo.getFullYear(),
    comparedTo.getMonth(),
    comparedTo.getDate()
  )
  return Math.floor((utcDate - utcCompared) / millisecondsPerDay)
}

export function normalizeRAGService(
  id: string,
  raw: Record<string, unknown>
): RAGService {
  const rawCategory = asString(raw.category)
  const category = CATEGORY_SET.has(rawCategory)
    ? (rawCategory as RAGServiceCategory)
    : "Hosting & Delivery"

  return {
    id,
    name: asString(raw.name),
    vendor: asString(raw.vendor),
    category,
    monthlyCost: Math.max(0, asNumber(raw.monthlyCost)),
    nextDueDate: asDateOnlyString(raw.nextDueDate),
    receiptUrl: asString(raw.receiptUrl) || undefined,
    notes: asString(raw.notes) || undefined,
    dependentProjects: asStringArray(raw.dependentProjects),
    createdAt: asTimestampString(raw.createdAt),
    updatedAt: asTimestampString(raw.updatedAt),
  }
}

export function sortRAGServices(services: RAGService[]) {
  return [...services].sort((left, right) => {
    const categoryCompare = left.category.localeCompare(right.category)
    if (categoryCompare !== 0) {
      return categoryCompare
    }

    const leftDue = parseDateOnly(left.nextDueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const rightDue = parseDateOnly(right.nextDueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
    if (leftDue !== rightDue) {
      return leftDue - rightDue
    }

    return left.name.localeCompare(right.name)
  })
}

export function getRAGServiceStatus(
  service: Pick<RAGService, "nextDueDate">,
  referenceDate = new Date()
): RAGServiceStatus {
  const nextDueDate = parseDateOnly(service.nextDueDate)
  if (!nextDueDate) {
    return "active"
  }

  const today = startOfToday(referenceDate)
  const dayDelta = differenceInCalendarDays(nextDueDate, today)

  if (dayDelta < 0) {
    return "overdue"
  }

  if (dayDelta <= 7) {
    return "due-soon"
  }

  return "active"
}

export function computeRAGServicesSummary(
  services: RAGService[],
  referenceDate = new Date()
) {
  const today = startOfToday(referenceDate)

  return services.reduce(
    (summary, service) => {
      summary.totalMonthlyCost += service.monthlyCost

      const nextDueDate = parseDateOnly(service.nextDueDate)
      if (!nextDueDate) {
        return summary
      }

      const dayDelta = differenceInCalendarDays(nextDueDate, today)
      if (dayDelta < 0) {
        summary.overdueCount += 1
      } else if (dayDelta <= 7) {
        summary.dueThisWeekCount += 1
      }

      return summary
    },
    {
      totalMonthlyCost: 0,
      overdueCount: 0,
      dueThisWeekCount: 0,
    }
  )
}

export function getRAGServiceSeed(referenceDate = new Date()): RAGServiceSeedInput[] {
  return [
    {
      name: "Vercel Pro",
      vendor: "Vercel",
      category: "Hosting & Delivery",
      monthlyCost: 24,
      nextDueDate: formatDateOnly(addDays(referenceDate, 3)),
      receiptUrl: "https://vercel.com/dashboard/billing",
      notes:
        "Primary hosting and deployment control plane for readyaimgo.biz and the client website surface.",
      dependentProjects: ["readyaimgo.biz", "client websites", "admin dashboard"],
    },
    {
      name: "Firebase / Firestore",
      vendor: "Google Firebase",
      category: "Data & Identity",
      monthlyCost: 35,
      nextDueDate: formatDateOnly(addDays(referenceDate, 5)),
      receiptUrl: "https://console.firebase.google.com/",
      notes:
        "Shared auth, Firestore, and storage layer backing the client directory, BEAM access, and admin ops.",
      dependentProjects: ["client directory", "BEAM portal access", "property ops"],
    },
    {
      name: "OpenAI API",
      vendor: "OpenAI",
      category: "AI & Automation",
      monthlyCost: 120,
      nextDueDate: formatDateOnly(addDays(referenceDate, -2)),
      receiptUrl: "https://platform.openai.com/usage",
      notes:
        "Usage-normalized monthly estimate for AI Pulse, URL analysis, and role suggestion generation.",
      dependentProjects: ["AI Pulse", "intake analyzer", "client role suggestions"],
    },
    {
      name: "Slack Pro",
      vendor: "Slack",
      category: "Comms & Alerts",
      monthlyCost: 35,
      nextDueDate: formatDateOnly(addDays(referenceDate, 9)),
      receiptUrl: "https://app.slack.com/admin/billing",
      notes:
        "Notification transport and background ops coordination for missioning, contact intake, and pulse alerts.",
      dependentProjects: ["ops notifications", "contact routing", "automation alerts"],
    },
    {
      name: "GitHub Team",
      vendor: "GitHub",
      category: "Hosting & Delivery",
      monthlyCost: 16,
      nextDueDate: formatDateOnly(addDays(referenceDate, 12)),
      receiptUrl: "https://github.com/settings/billing",
      notes:
        "Repository hosting, issue tracking, and TODO sync surface connected into admin workflows.",
      dependentProjects: ["GitHub sync", "repo TODOs", "deployment linkage"],
    },
    {
      name: "Zoho Mail + Calendar",
      vendor: "Zoho",
      category: "Comms & Alerts",
      monthlyCost: 12,
      nextDueDate: formatDateOnly(addDays(referenceDate, 1)),
      receiptUrl: "https://mailadmin.zoho.com/",
      notes:
        "Ops inbox and calendar source for pulse ingestion, scheduling, and finance communications.",
      dependentProjects: ["ops inbox", "calendar pulse", "finance mailbox"],
    },
    {
      name: "Google Maps Platform",
      vendor: "Google Cloud",
      category: "Data & Identity",
      monthlyCost: 25,
      nextDueDate: formatDateOnly(addDays(referenceDate, 6)),
      receiptUrl: "https://console.cloud.google.com/billing",
      notes:
        "Map tiles and geospatial services powering property ops and location-aware delivery surfaces.",
      dependentProjects: ["property ops map", "location embeds", "route intelligence"],
    },
    {
      name: "Stripe Platform Fees",
      vendor: "Stripe",
      category: "Finance & Payments",
      monthlyCost: 48,
      nextDueDate: formatDateOnly(addDays(referenceDate, 14)),
      receiptUrl: "https://dashboard.stripe.com/",
      notes:
        "Rolling monthly estimate for payment processing overhead across pricing, partner checkout, and subscriptions.",
      dependentProjects: ["pricing flow", "partner onramp", "subscriptions"],
    },
  ]
}

export function readRAGServiceMutationFields(raw: Record<string, unknown>) {
  const patch: Partial<Omit<RAGService, "id" | "createdAt" | "updatedAt">> = {}

  if (typeof raw.name === "string") {
    patch.name = raw.name.trim()
  }

  if (typeof raw.vendor === "string") {
    patch.vendor = raw.vendor.trim()
  }

  if (typeof raw.category === "string" && CATEGORY_SET.has(raw.category.trim())) {
    patch.category = raw.category.trim() as RAGServiceCategory
  }

  if (
    typeof raw.monthlyCost === "number" ||
    typeof raw.monthlyCost === "string"
  ) {
    patch.monthlyCost = Math.max(0, asNumber(raw.monthlyCost))
  }

  if (typeof raw.nextDueDate === "string") {
    const normalizedDate = asDateOnlyString(raw.nextDueDate)
    if (normalizedDate) {
      patch.nextDueDate = normalizedDate
    }
  }

  if (typeof raw.receiptUrl === "string") {
    patch.receiptUrl = raw.receiptUrl.trim()
  }

  if (typeof raw.notes === "string") {
    patch.notes = raw.notes.trim()
  }

  if (Array.isArray(raw.dependentProjects)) {
    patch.dependentProjects = asStringArray(raw.dependentProjects).map((project) => project.trim())
  }

  return patch
}
