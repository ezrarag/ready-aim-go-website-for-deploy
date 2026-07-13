import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

type Params = { params: Promise<{ workspaceId: string }> }

function readString(value: FormDataEntryValue | unknown, maxLength = 4000) {
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
      .collection("files")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((doc) => serializeFirestoreDocument(doc.id, doc.data())),
    })
  } catch (error) {
    console.error("GET /api/workspaces/[workspaceId]/files:", error)
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

    const form = await request.formData()
    const file = form.get("file")
    const title = readString(form.get("title"), 280)
    if (!(file instanceof Blob) || !("name" in file) || file.size === 0) {
      return NextResponse.json({ success: false, error: "file is required" }, { status: 400 })
    }

    const bucket = getStorageBucket()
    if (!bucket) {
      return NextResponse.json({ success: false, error: "Storage not configured" }, { status: 503 })
    }

    const fileRef = db.collection("workspaces").doc(workspaceId).collection("files").doc()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-")
    const storagePath = `workspaces/${workspaceId}/files/${fileRef.id}-${safeName}`
    await bucket.file(storagePath).save(Buffer.from(await file.arrayBuffer()), {
      metadata: { contentType: file.type || "application/octet-stream" },
    })
    await bucket.file(storagePath).makePublic()
    const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

    const now = new Date().toISOString()
    const scope = readString(form.get("scope"), 120) || "workspace"
    await fileRef.set({
      id: fileRef.id,
      workspaceId,
      projectId: readString(form.get("projectId"), 240) || null,
      title: title || file.name,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      url,
      storagePath,
      scope,
      authorKind: "admin",
      createdAt: now,
      updatedAt: now,

      // Client Hub compatibility fields:
      name: title || file.name,
      contentType: file.type || "application/octet-stream",
      downloadUrl: url,
      category: scope === "contract" ? "contract" : "general",
      uploadedByUid: "admin",
      uploadedByEmail: "support@readyaimgo.biz",
    })

    return NextResponse.json({ success: true, id: fileRef.id, url }, { status: 201 })
  } catch (error) {
    console.error("POST /api/workspaces/[workspaceId]/files:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
