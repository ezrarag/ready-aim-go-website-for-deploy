export const ADMIN_PRODUCT_KEYS = ["nexus", "space", "motion", "cohort"] as const

export type AdminProductKey = (typeof ADMIN_PRODUCT_KEYS)[number]

export type AdminSubscriptionStatus =
  | "active"
  | "trialing"
  | "paused"
  | "cancelled"
  | "inactive"

export type AdminProductSubscription = {
  product: AdminProductKey
  status: AdminSubscriptionStatus
  planId: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  startedAt: string | null
  renewalAt: string | null
  updatedAt: string | null
  legacy: boolean
}

export type AdminProductDefinition = {
  id: AdminProductKey
  label: string
  description: string
  legacyModuleKeys: string[]
}

export const ADMIN_PRODUCTS: AdminProductDefinition[] = [
  {
    id: "nexus",
    label: "Nexus",
    description: "Web, app, R&D, creative support, and client operating infrastructure.",
    legacyModuleKeys: ["web", "app", "rd"],
  },
  {
    id: "space",
    label: "Space",
    description: "Workspace, rooms, pop-ups, studios, property ops, and facilities support.",
    legacyModuleKeys: ["housing", "property-ops"],
  },
  {
    id: "motion",
    label: "Motion",
    description: "Transportation, fleet, rides, delivery, and logistics coordination.",
    legacyModuleKeys: ["transportation"],
  },
  {
    id: "cohort",
    label: "Cohort",
    description: "BEAM participants, specialist teams, training, and cohort delivery capacity.",
    legacyModuleKeys: ["beam-participants"],
  },
]

export const ADMIN_PRODUCT_LABELS: Record<AdminProductKey, string> = ADMIN_PRODUCTS.reduce(
  (labels, product) => {
    labels[product.id] = product.label
    return labels
  },
  {} as Record<AdminProductKey, string>
)

export function readAdminProductKeys(value: unknown): AdminProductKey[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter(
    (item): item is AdminProductKey =>
      typeof item === "string" && ADMIN_PRODUCT_KEYS.includes(item as AdminProductKey)
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeSubscriptionStatus(value: unknown): AdminSubscriptionStatus {
  return value === "active" ||
    value === "trialing" ||
    value === "paused" ||
    value === "cancelled" ||
    value === "inactive"
    ? value
    : "inactive"
}

function hasEnabledLegacyModule(modules: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => {
    const moduleValue = modules[key]
    if (moduleValue === true) return true
    const moduleRecord = asRecord(moduleValue)
    return moduleRecord.enabled === true
  })
}

export function normalizeClientSubscriptions(
  client: Record<string, unknown>
): Record<AdminProductKey, AdminProductSubscription> {
  const subscriptions = asRecord(client.subscriptions)
  const modules = asRecord(client.modules)

  return ADMIN_PRODUCTS.reduce((normalized, product) => {
    const stored = asRecord(subscriptions[product.id])
    const hasStoredData = Object.keys(stored).length > 0
    const legacyActive = !hasStoredData && hasEnabledLegacyModule(modules, product.legacyModuleKeys)
    const status = hasStoredData
      ? normalizeSubscriptionStatus(stored.status)
      : legacyActive
        ? "active"
        : "inactive"

    normalized[product.id] = {
      product: product.id,
      status,
      planId: readString(stored.planId),
      stripeCustomerId: readString(stored.stripeCustomerId),
      stripeSubscriptionId: readString(stored.stripeSubscriptionId),
      startedAt: readString(stored.startedAt),
      renewalAt: readString(stored.renewalAt),
      updatedAt: readString(stored.updatedAt),
      legacy: legacyActive,
    }

    return normalized
  }, {} as Record<AdminProductKey, AdminProductSubscription>)
}

export function getActiveProductKeys(
  subscriptions: Record<AdminProductKey, AdminProductSubscription>
): AdminProductKey[] {
  return ADMIN_PRODUCT_KEYS.filter((key) => {
    const status = subscriptions[key]?.status
    return status === "active" || status === "trialing"
  })
}

export function getModuleKeysForProducts(products: AdminProductKey[]): import("@/lib/client-directory").ModuleKey[] {
  const moduleKeys = new Set<import("@/lib/client-directory").ModuleKey>()
  for (const product of ADMIN_PRODUCTS) {
    if (!products.includes(product.id)) continue
    for (const moduleKey of product.legacyModuleKeys) {
      if (
        moduleKey === "web" ||
        moduleKey === "app" ||
        moduleKey === "rd" ||
        moduleKey === "housing" ||
        moduleKey === "transportation" ||
        moduleKey === "insurance"
      ) {
        moduleKeys.add(moduleKey)
      }
    }
  }
  return Array.from(moduleKeys)
}

export function getProductsForModuleKeys(
  moduleKeys: import("@/lib/client-directory").ModuleKey[]
): AdminProductKey[] {
  const enabled = new Set(moduleKeys)
  return ADMIN_PRODUCTS.filter((product) =>
    product.legacyModuleKeys.some((key) => enabled.has(key as import("@/lib/client-directory").ModuleKey))
  ).map((product) => product.id)
}

export function buildSubscriptionsFromActiveProducts(
  client: Record<string, unknown>,
  activeProducts: AdminProductKey[]
): Record<AdminProductKey, AdminProductSubscription> {
  const current = normalizeClientSubscriptions(client)
  const active = new Set(activeProducts)
  const now = new Date().toISOString()

  return ADMIN_PRODUCT_KEYS.reduce((subscriptions, key) => {
    const existing = current[key]
    const nextStatus = active.has(key)
      ? existing.status === "trialing"
        ? "trialing"
        : "active"
      : "inactive"

    subscriptions[key] = {
      ...existing,
      product: key,
      status: nextStatus,
      startedAt: active.has(key) ? existing.startedAt ?? now : existing.startedAt,
      updatedAt: now,
      legacy: false,
    }
    return subscriptions
  }, {} as Record<AdminProductKey, AdminProductSubscription>)
}
