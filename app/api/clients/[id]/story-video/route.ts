import { FieldValue } from "firebase-admin/firestore"
import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { decodeRouteParam } from "@/lib/route-params"

function safeFileName(value: string) {
  const name = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return name || "story-video"
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const clientId = decodeRouteParam(id)
    const db = getFirestoreDb()
    const bucket = getStorageBucket()

    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })
    if (!bucket) return NextResponse.json({ success: false, error: "Storage unavailable" }, { status: 503 })

    const formData = await request.formData()
    const candidate = formData.get("file")

    if (!candidate || typeof candidate === "string" || typeof candidate.arrayBuffer !== "function") {
      return NextResponse.json({ success: false, error: "file is required" }, { status: 400 })
    }

    const file = candidate as File
    const contentType = file.type || "application/octet-stream"
    if (!contentType.startsWith("video/")) {
      return NextResponse.json({ success: false, error: "Only video uploads are supported" }, { status: 400 })
    }

    const clientRef = db.collection("clients").doc(clientId)
    const clientSnapshot = await clientRef.get()
    if (!clientSnapshot.exists) {
      return NextResponse.json({ success: false, error: "Relationship not found" }, { status: 404 })
    }

    const timestamp = Date.now()
    const storagePath = `clients/${clientId}/story-video/${timestamp}-${safeFileName(file.name)}`
    const storageFile = bucket.file(storagePath)
    const bytes = Buffer.from(await file.arrayBuffer())

    await storageFile.save(bytes, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
      resumable: false,
    })

    const [url] = await storageFile.getSignedUrl({
      action: "read",
      expires: "2035-01-01",
    })

    await clientRef.set(
      {
        storyVideoUrl: url,
        storyVideoStoragePath: storagePath,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    return NextResponse.json({ success: true, url, storagePath })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
