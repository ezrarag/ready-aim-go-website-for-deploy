import { Timestamp } from "firebase-admin/firestore"

export type ClientRetainerSource =
  | "invoice_paid"
  | "manual"
  | "stripe"
  | "bank_transfer"
  | "check"

export type ClientRetainer = {
  amountTotal: number
  currency: string
  source: ClientRetainerSource
  poolId: string
  active: boolean
}

export type WalletPool = {
  id: string
  name: string
  currency: string
  active: boolean
  notes?: string
  createdAt?: Timestamp | Date | string
  updatedAt?: Timestamp | Date | string
}

export type WalletContribution = {
  id: string
  clientId: string
  clientName?: string
  poolId: string
  amount: number
  currency: string
  source: ClientRetainerSource
  receivedAt: string
  note?: string
  invoiceId?: string
  createdAt?: Timestamp | Date | string
  updatedAt?: Timestamp | Date | string
}

export type WalletAllocation = {
  id: string
  poolId: string
  amount: number
  currency: string
  allocatedAt: string
  purpose: string
  recipientType: "employee" | "beam_cohort" | "vendor" | "other"
  recipientId?: string
  recipientLabel?: string
  note?: string
  createdAt?: Timestamp | Date | string
  updatedAt?: Timestamp | Date | string
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

function asTimestampLike(value: unknown): Timestamp | Date | string | undefined {
  if (
    typeof value === "string" ||
    value instanceof Date ||
    (value && typeof value === "object" && "toDate" in value)
  ) {
    return value as Timestamp | Date | string
  }
  return undefined
}

function asRetainerSource(value: unknown): ClientRetainerSource {
  return value === "invoice_paid" ||
    value === "manual" ||
    value === "stripe" ||
    value === "bank_transfer" ||
    value === "check"
    ? value
    : "manual"
}

export function normalizeClientRetainer(value: unknown): ClientRetainer | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const poolId = asString(raw.poolId)
  const currency = asString(raw.currency, "usd").toLowerCase() || "usd"

  if (!poolId) return undefined

  return {
    amountTotal: Math.max(0, asNumber(raw.amountTotal)),
    currency,
    source: asRetainerSource(raw.source),
    poolId,
    active: asBoolean(raw.active, true),
  }
}

export function normalizeWalletPool(id: string, value: Record<string, unknown>): WalletPool {
  return {
    id,
    name: asString(value.name) || id,
    currency: asString(value.currency, "usd").toLowerCase() || "usd",
    active: asBoolean(value.active, true),
    notes: asString(value.notes) || undefined,
    createdAt: asTimestampLike(value.createdAt),
    updatedAt: asTimestampLike(value.updatedAt),
  }
}

export function normalizeWalletContribution(
  id: string,
  value: Record<string, unknown>
): WalletContribution {
  return {
    id,
    clientId: asString(value.clientId),
    clientName: asString(value.clientName) || undefined,
    poolId: asString(value.poolId),
    amount: Math.max(0, asNumber(value.amount)),
    currency: asString(value.currency, "usd").toLowerCase() || "usd",
    source: asRetainerSource(value.source),
    receivedAt: asString(value.receivedAt),
    note: asString(value.note) || undefined,
    invoiceId: asString(value.invoiceId) || undefined,
    createdAt: asTimestampLike(value.createdAt),
    updatedAt: asTimestampLike(value.updatedAt),
  }
}

export function normalizeWalletAllocation(
  id: string,
  value: Record<string, unknown>
): WalletAllocation {
  const recipientType =
    value.recipientType === "employee" ||
    value.recipientType === "beam_cohort" ||
    value.recipientType === "vendor" ||
    value.recipientType === "other"
      ? value.recipientType
      : "other"

  return {
    id,
    poolId: asString(value.poolId),
    amount: Math.max(0, asNumber(value.amount)),
    currency: asString(value.currency, "usd").toLowerCase() || "usd",
    allocatedAt: asString(value.allocatedAt),
    purpose: asString(value.purpose),
    recipientType,
    recipientId: asString(value.recipientId) || undefined,
    recipientLabel: asString(value.recipientLabel) || undefined,
    note: asString(value.note) || undefined,
    createdAt: asTimestampLike(value.createdAt),
    updatedAt: asTimestampLike(value.updatedAt),
  }
}

export function formatWalletDate(value: string | Timestamp | Date | undefined | null): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  if ("toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }
  return null
}

export const TFH_POOL_ID = "tfh-3000-pool"

export function isTFHClientCandidate(client: {
  name?: string
  storyId?: string
  retainer?: ClientRetainer
}) {
  const token = `${client.name ?? ""} ${client.storyId ?? ""}`.toLowerCase()
  return token.includes("tfh") &&
    client.retainer?.poolId === TFH_POOL_ID &&
    client.retainer.amountTotal === 3000 &&
    client.retainer.source === "invoice_paid" &&
    client.retainer.active === true
}
