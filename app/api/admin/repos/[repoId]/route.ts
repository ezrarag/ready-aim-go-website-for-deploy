import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

type Params = { params: Promise<{ repoId: string }> }

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })
    const { repoId } = await context.params
    const doc = await db.collection("repos").doc(repoId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Repo link not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } })
  } catch (error) {
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
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })
    const { repoId } = await context.params
    const ref = db.collection("repos").doc(repoId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Repo link not found" }, { status: 404 })
    }

    await ref.delete()

    await writeAuditLog({
      collection: "repos",
      docId: repoId,
      action: "delete",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: snap.data(),
    })

    return NextResponse.json({ success: true, data: { id: repoId } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
