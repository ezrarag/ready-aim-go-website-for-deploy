import { type NextRequest, NextResponse } from "next/server"

import { extractActorKey, writeAuditLog } from "@/lib/audit-log"
import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

type Params = { params: Promise<{ contractId: string }> }

function readString(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { contractId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("contracts").doc(contractId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Contract not found." }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { id: doc.id, ...(doc.data() ?? {}) } })
  } catch (error) {
    console.error("GET /api/contracts/[contractId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { contractId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("contracts").doc(contractId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Contract not found." }, { status: 404 })
    }

    const contentType = request.headers.get("content-type") || ""
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      if (file instanceof Blob && "name" in file && file.size > 0) {
        const bucket = getStorageBucket()
        if (!bucket) {
          return NextResponse.json({ success: false, error: "Storage not configured" }, { status: 503 })
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-")
        const storagePath = `contracts/${contractId}/${Date.now()}-${safeName}`
        await bucket.file(storagePath).save(Buffer.from(await file.arrayBuffer()), {
          metadata: { contentType: file.type || "application/octet-stream" },
        })
        await bucket.file(storagePath).makePublic()
        patch.fileUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`
        patch.attachmentUrl = patch.fileUrl
        patch.storagePath = storagePath
      }
      if (form.has("status")) patch.status = readString(form.get("status"), 120) || "draft"
      if (form.has("title")) patch.title = readString(form.get("title"), 280)
      if (form.has("notes")) patch.notes = readString(form.get("notes"), 12000) || null
    } else {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
      if ("title" in body) patch.title = readString(body.title, 280)
      if ("status" in body) patch.status = readString(body.status, 120) || "draft"
      if ("type" in body) patch.type = readString(body.type, 120) || null
      if ("notes" in body) patch.notes = readString(body.notes, 12000) || null
      if ("attachmentUrl" in body) patch.attachmentUrl = readString(body.attachmentUrl, 2000) || null
      if ("fileUrl" in body) patch.fileUrl = readString(body.fileUrl, 2000) || null
    }

    await ref.set(patch, { merge: true })

    await writeAuditLog({
      collection: "contracts",
      docId: contractId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: patch,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/contracts/[contractId]:", error)
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
    const { contractId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("contracts").doc(contractId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Contract not found." }, { status: 404 })
    }

    const data = snap.data() as Record<string, unknown>
    const storagePath = readString(data.storagePath, 2000)
    if (storagePath) {
      const bucket = getStorageBucket()
      await bucket?.file(storagePath).delete().catch(() => null)
    }

    await ref.delete()

    await writeAuditLog({
      collection: "contracts",
      docId: contractId,
      action: "delete",
      actorKey: extractActorKey(request.headers.get("authorization")),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/contracts/[contractId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
