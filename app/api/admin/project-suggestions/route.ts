import { type NextRequest, NextResponse } from "next/server"
import type { Query } from "firebase-admin/firestore"

import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"

type SuggestionRecord = Record<string, unknown> & { id: string }

function createdAtMillis(item: SuggestionRecord) {
  const value = typeof item.createdAt === "string" ? Date.parse(item.createdAt) : 0
  return Number.isFinite(value) ? value : 0
}

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")?.trim()
    const clientId = searchParams.get("clientId")?.trim()
    const projectId = searchParams.get("projectId")?.trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200)

    const queries: Query[] = []
    if (workspaceId) queries.push(db.collection("clientFeedback").where("workspaceId", "==", workspaceId))
    if (clientId) queries.push(db.collection("clientFeedback").where("clientId", "==", clientId))
    if (projectId) queries.push(db.collection("clientFeedback").where("projectId", "==", projectId))
    if (queries.length === 0) {
      queries.push(db.collection("clientFeedback").where("source", "==", "workspace-project-suggestion"))
    }

    const snapshots = await Promise.all(queries.map((query) => query.limit(limit).get()))
    const byId = new Map<string, SuggestionRecord>()
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        const serialized = serializeFirestoreDocument(doc.id, doc.data()) as SuggestionRecord
        byId.set(doc.id, serialized)
      }
    }

    const data = Array.from(byId.values())
      .sort((a, b) => createdAtMillis(b) - createdAtMillis(a))
      .slice(0, limit)

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("GET /api/admin/project-suggestions:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
