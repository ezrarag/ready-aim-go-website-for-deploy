import { createHmac, timingSafeEqual } from "crypto"

type UnknownRecord = Record<string, unknown>

export interface AppStoreWebhookSummary {
  eventType: string
  eventId?: string
  appId?: string
  resourceId?: string
  resourceType?: string
  state?: string
  feedbackType?: string
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function getNestedString(value: unknown, path: string[]): string | undefined {
  let current: unknown = value
  for (const part of path) {
    const record = asRecord(current)
    if (!record) return undefined
    current = record[part]
  }
  return asString(current)
}

function findFirstDeepString(value: unknown, keys: string[]): string | undefined {
  const queue: unknown[] = [value]

  while (queue.length > 0) {
    const current = queue.shift()
    if (Array.isArray(current)) {
      queue.push(...current)
      continue
    }

    const record = asRecord(current)
    if (!record) continue

    for (const key of keys) {
      const candidate = asString(record[key])
      if (candidate) return candidate
    }

    queue.push(...Object.values(record))
  }

  return undefined
}

export function getAppStoreWebhookSecret(): string | null {
  const value = process.env.APP_STORE_CONNECT_WEBHOOK_SECRET?.trim()
  return value || null
}

function normalizeSignatureCandidate(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  const withoutPrefix = trimmed.replace(/^sha256=/i, "")
  return [...new Set([trimmed, withoutPrefix])]
}

export function verifyAppStoreWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const digestBase64 = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")
  const digestBase64Url = digestBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  const digestHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  const candidates = normalizeSignatureCandidate(signatureHeader)

  for (const candidate of candidates) {
    const expected = [digestBase64, digestBase64Url, digestHex].find((value) => value.length === candidate.length)
    if (!expected) continue

    try {
      if (timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))) {
        return true
      }
    } catch {
      continue
    }
  }

  return false
}

export function extractAppStoreWebhookSummary(payload: unknown): AppStoreWebhookSummary {
  const eventType =
    getNestedString(payload, ["eventType"]) ||
    getNestedString(payload, ["type"]) ||
    getNestedString(payload, ["data", "type"]) ||
    findFirstDeepString(payload, ["eventType", "notificationType", "type"]) ||
    "unknown"

  const dataType = getNestedString(payload, ["data", "type"])
  const dataId = getNestedString(payload, ["data", "id"])
  const appId =
    getNestedString(payload, ["data", "relationships", "app", "data", "id"]) ||
    getNestedString(payload, ["relationships", "app", "data", "id"]) ||
    getNestedString(payload, ["app", "id"]) ||
    getNestedString(payload, ["data", "app", "id"]) ||
    (dataType === "apps" ? dataId : undefined) ||
    findFirstDeepString(payload, ["appAdamId", "appId"])

  return {
    eventType,
    eventId:
      getNestedString(payload, ["eventId"]) ||
      getNestedString(payload, ["id"]) ||
      findFirstDeepString(payload, ["eventId", "notificationId"]),
    appId,
    resourceId:
      dataId ||
      getNestedString(payload, ["resource", "id"]) ||
      findFirstDeepString(payload, ["buildId", "betaBuildId", "feedbackId"]),
    resourceType:
      dataType ||
      getNestedString(payload, ["resource", "type"]) ||
      findFirstDeepString(payload, ["feedbackType"]),
    state:
      findFirstDeepString(payload, ["processingState", "betaState", "appVersionState", "state"]),
    feedbackType: findFirstDeepString(payload, ["feedbackType"]),
  }
}
