type TimestampLike = {
  _nanoseconds?: number
  _seconds?: number
  nanoseconds?: number
  seconds?: number
  toDate?: () => Date
}

function dateToIsoString(date: Date): string | null {
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function hasTimestampShape(value: TimestampLike) {
  return (
    typeof value.toDate === "function" ||
    (typeof value._seconds === "number" && typeof value._nanoseconds === "number") ||
    (typeof value.seconds === "number" && typeof value.nanoseconds === "number")
  )
}

function timestampLikeToIso(value: TimestampLike): string | null {
  if (typeof value.toDate === "function") {
    try {
      const date = value.toDate()
      if (date instanceof Date) return dateToIsoString(date)
    } catch {
      // Fall through to numeric timestamp fields when present.
    }
  }

  const seconds = value._seconds ?? value.seconds
  const nanoseconds = value._nanoseconds ?? value.nanoseconds ?? 0
  if (typeof seconds === "number") {
    return dateToIsoString(new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000)))
  }

  return null
}

export function serializeFirestoreValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value
  if (value instanceof Date) return dateToIsoString(value)
  if (Array.isArray(value)) return value.map((item) => serializeFirestoreValue(item, seen))

  if (typeof value === "object") {
    const timestamp = value as TimestampLike
    if (hasTimestampShape(timestamp)) return timestampLikeToIso(timestamp)

    if (seen.has(value)) return null
    seen.add(value)

    const serialized: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      serialized[key] = serializeFirestoreValue(child, seen)
    }

    seen.delete(value)
    return serialized
  }

  return value
}

export function serializeFirestoreDocument(
  id: string,
  data: Record<string, unknown> | undefined
): Record<string, unknown> {
  const serialized = serializeFirestoreValue(data ?? {})
  return {
    id,
    ...((serialized && typeof serialized === "object" && !Array.isArray(serialized)
      ? serialized
      : {}) as Record<string, unknown>),
  }
}
