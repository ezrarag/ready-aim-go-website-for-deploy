import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

type Params = { params: Promise<{ workspaceId: string }> }

function readString(value: unknown, maxLength = 12000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const snap = await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((doc) => serializeFirestoreDocument(doc.id, doc.data())),
    })
  } catch (error) {
    console.error("GET /api/workspaces/[workspaceId]/messages:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const content = readString(body.content, 16000)
    if (!content) {
      return NextResponse.json({ success: false, error: "content is required" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const ref = db.collection("workspaces").doc(workspaceId).collection("messages").doc()
    await ref.set({
      id: ref.id,
      workspaceId,
      projectId: readString(body.projectId, 240) || null,
      clientId: readString(body.clientId, 240) || null,
      title: readString(body.title, 280) || null,
      content,
      visibility: readString(body.visibility, 120) || "internal_admin_to_client",
      authorKind: "admin",
      authorLabel: readString(body.authorLabel, 160) || "Admin",
      createdByUid: readString(body.createdByUid, 160) || "admin",
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ success: true, id: ref.id }, { status: 201 })
  } catch (error) {
    console.error("POST /api/workspaces/[workspaceId]/messages:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
