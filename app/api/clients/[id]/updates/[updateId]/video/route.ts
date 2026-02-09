import { type NextRequest, NextResponse } from "next/server"
import { getStorageBucket } from "@/lib/firestore"
import { getClientUpdateById, updateClientUpdate } from "@/lib/firestore"

/** Upload video for an update. Stores at clients/{clientId}/updates/{updateId}/video.mp4 and saves public URL to Firestore. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; updateId: string }> }
) {
  try {
    const params = await context.params
    const clientId = params.id
    const updateId = params.updateId

    const existing = await getClientUpdateById(clientId, updateId)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Update not found" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("video") as File | null
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "video file is required (multipart form field 'video')" },
        { status: 400 }
      )
    }

    const bucket = getStorageBucket()
    if (!bucket) {
      return NextResponse.json(
        { success: false, error: "Storage not configured" },
        { status: 503 }
      )
    }

    const storagePath = `clients/${clientId}/updates/${updateId}/video.mp4`
    const buffer = Buffer.from(await file.arrayBuffer())

    const bucketFile = bucket.file(storagePath)
    await bucketFile.save(buffer, {
      metadata: {
        contentType: file.type || "video/mp4",
      },
    })

    await bucketFile.makePublic()
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

    await updateClientUpdate(clientId, updateId, {
      video: {
        ...existing.video,
        publicUrl,
        storagePath,
      },
    })

    return NextResponse.json({
      success: true,
      publicUrl,
      storagePath,
    })
  } catch (error) {
    console.error("Video upload failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    )
  }
}
