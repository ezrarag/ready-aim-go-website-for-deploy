import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

type Params = { params: Promise<{ workspaceId: string; fileId: string }> }

function readString(value: unknown, maxLength = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId, fileId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("workspaces").doc(workspaceId).collection("files").doc(fileId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { id: doc.id, ...(doc.data() ?? {}) } })
  } catch (error) {
    console.error("GET /api/workspaces/[workspaceId]/files/[fileId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId, fileId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("workspaces").doc(workspaceId).collection("files").doc(fileId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "File not found." }, { status: 404 })
    }

    const storagePath = readString((snap.data() as Record<string, unknown>).storagePath)
    if (storagePath) {
      await getStorageBucket()?.file(storagePath).delete().catch(() => null)
    }

    await ref.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/workspaces/[workspaceId]/files/[fileId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
