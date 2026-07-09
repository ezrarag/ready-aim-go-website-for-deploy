import { type NextRequest, NextResponse } from "next/server"

import { extractActorKey, writeAuditLog } from "@/lib/audit-log"
import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

function readString(value: FormDataEntryValue | unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
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
    const status = searchParams.get("status")?.trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200)

    let query: FirebaseFirestore.Query = db.collection("contracts")
    if (workspaceId) query = query.where("workspaceId", "==", workspaceId)
    if (clientId) query = query.where("clientId", "==", clientId)
    if (status) query = query.where("status", "==", status)

    const snap = await query.limit(limit).get()
    return NextResponse.json({
      success: true,
      data: snap.docs.map((doc) => serializeFirestoreDocument(doc.id, doc.data())),
    })
  } catch (error) {
    console.error("GET /api/contracts:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const contentType = request.headers.get("content-type") || ""
    let payload: Record<string, unknown> = {}
    let uploadedFileUrl: string | null = null
    let storagePath: string | null = null

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      payload = {
        workspaceId: readString(form.get("workspaceId"), 240),
        clientId: readString(form.get("clientId"), 240),
        title: readString(form.get("title"), 280),
        status: readString(form.get("status"), 120) || "draft",
        type: readString(form.get("type"), 120) || "scope_of_work",
        notes: readString(form.get("notes"), 12000) || null,
      }

      const file = form.get("file")
      if (file instanceof Blob && "name" in file && file.size > 0) {
        const bucket = getStorageBucket()
        if (!bucket) {
          return NextResponse.json({ success: false, error: "Storage not configured" }, { status: 503 })
        }

        const workspaceId = readString(payload.workspaceId, 240)
        const clientId = readString(payload.clientId, 240)
        const contractKey = `${workspaceId || clientId || "contract"}-${Date.now()}`
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-")
        storagePath = `contracts/${contractKey}/${safeName}`
        await bucket.file(storagePath).save(Buffer.from(await file.arrayBuffer()), {
          metadata: { contentType: file.type || "application/octet-stream" },
        })
        await bucket.file(storagePath).makePublic()
        uploadedFileUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`
      }
    } else {
      payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
    }

    const workspaceId = readString(payload.workspaceId, 240)
    const clientId = readString(payload.clientId, 240)
    const title = readString(payload.title, 280)
    if (!workspaceId || !clientId || !title) {
      return NextResponse.json(
        { success: false, error: "workspaceId, clientId, and title are required." },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const doc = {
      workspaceId,
      clientId,
      title,
      status: readString(payload.status, 120) || "draft",
      type: readString(payload.type, 120) || "scope_of_work",
      notes: readString(payload.notes, 12000) || null,
      attachmentUrl: uploadedFileUrl || readString(payload.attachmentUrl, 2000) || null,
      fileUrl: uploadedFileUrl || readString(payload.fileUrl, 2000) || null,
      storagePath,
      createdAt: now,
      updatedAt: now,
      createdByUid: "admin",
      authorSource: "admin",
    }

    const ref = await db.collection("contracts").add(doc)

    await writeAuditLog({
      collection: "contracts",
      docId: ref.id,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { workspaceId, clientId, title, status: doc.status, type: doc.type },
    })

    return NextResponse.json({ success: true, data: { id: ref.id, ...doc } }, { status: 201 })
  } catch (error) {
    console.error("POST /api/contracts:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
