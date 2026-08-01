import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export async function GET(request: NextRequest) {
  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const snapshot = await db.collection("gitHubIntakeBucket").orderBy("createdAt", "desc").get()
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error("GET /api/admin/intake/repos error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch intake items" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = await request.json().catch(() => ({}))
    const partnerName = typeof body.partnerName === "string" ? body.partnerName.trim() : ""
    const repoURL = typeof body.repoURL === "string" ? body.repoURL.trim() : ""
    const notes = typeof body.notes === "string" ? body.notes.trim() : ""
    const category = typeof body.category === "string" ? body.category.trim() : "sandbox"

    if (!partnerName || !repoURL) {
      return NextResponse.json({ success: false, error: "Partner Name and Repo URL are required" }, { status: 400 })
    }

    const docRef = db.collection("gitHubIntakeBucket").doc()
    const data = {
      id: docRef.id,
      partnerName,
      repoURL,
      notes,
      category,
      promoted: false,
      createdAt: new Date().toISOString(),
    }

    await docRef.set(data)
    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error("POST /api/admin/intake/repos error:", error)
    return NextResponse.json({ success: false, error: "Failed to save intake item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 })
    }

    await db.collection("gitHubIntakeBucket").doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/admin/intake/repos error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete intake item" }, { status: 500 })
  }
}
