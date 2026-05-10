/**
 * Shared audit-log helper.
 * Every admin mutation writes a document to `auditLog/{autoId}`.
 */
import { getFirestoreDb } from "@/lib/firestore"

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "promote"
  | "ingest"

export type AuditEntry = {
  collection: string
  docId: string
  action: AuditAction
  actorKey?: string          // masked API key prefix, if present
  payload?: Record<string, unknown>
  timestamp: string
}

/**
 * Write an audit log entry. Swallows errors so a logging failure never
 * blocks the actual mutation response.
 */
export async function writeAuditLog(entry: Omit<AuditEntry, "timestamp">): Promise<void> {
  try {
    const db = getFirestoreDb()
    if (!db) return
    await db.collection("auditLog").add({
      ...entry,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.warn("auditLog write failed:", err)
  }
}

/** Extract a safe prefix from the Authorization header for audit context. */
export function extractActorKey(authHeader: string | null): string | undefined {
  if (!authHeader) return undefined
  const token = authHeader.replace(/^Bearer\s+/i, "")
  return token.length > 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : undefined
}
