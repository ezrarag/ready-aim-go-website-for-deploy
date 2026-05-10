import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import type { ClientDeliverable } from "@/lib/types/client-billing"

// Firestore: clients/{clientId}/deliverables/{deliverableId}

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id: clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let query: FirebaseFirestore.Query = db
      .collection("clients")
      .doc(clientId)
      .collection("deliverables")
    if (status) query = query.where("status", "==", status)

    const snap = await query.get()
    const data: ClientDeliverable[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClientDeliverable, "id">),
    }))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("GET /api/clients/[id]/deliverables:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id: clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 })
    }
    const amount = typeof body.amount === "number" && body.amount >= 0 ? body.amount : 0

    const now = new Date().toISOString()
    const payload: Omit<ClientDeliverable, "id"> = {
      clientId,
      title,
      summary: typeof body.summary === "string" ? body.summary : "",
      liveUrl: typeof body.liveUrl === "string" ? body.liveUrl : "",
      screenshotUrls: Array.isArray(body.screenshotUrls)
        ? (body.screenshotUrls as unknown[]).filter(
            (u): u is string => typeof u === "string"
          )
        : [],
      amount,
      status: "pending",
    }

    const ref = db.collection("clients").doc(clientId).collection("deliverables").doc()
    await ref.set({ ...payload, createdAt: now, updatedAt: now })

    return NextResponse.json(
      { success: true, data: { id: ref.id, ...payload } },
      { status: 201 }
    )
  } catch (err) {
    console.error("POST /api/clients/[id]/deliverables:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
