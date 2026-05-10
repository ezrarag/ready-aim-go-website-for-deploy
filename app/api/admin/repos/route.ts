import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

// Firestore collection: "repos"

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const projectId = searchParams.get("projectId")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200)

    let query: FirebaseFirestore.Query = db.collection("repos")
    if (clientId) query = query.where("clientId", "==", clientId)
    if (projectId) query = query.where("projectId", "==", projectId)
    const snap = await query.limit(limit).get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    })
  } catch (err) {
    console.error("GET /api/admin/repos:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
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

    const body = (await request.json()) as Record<string, unknown>
    const repoSlug = typeof body.repoSlug === "string" ? body.repoSlug.trim() : ""
    if (!repoSlug) {
      return NextResponse.json({ success: false, error: "repoSlug is required" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const payload = { ...body, repoSlug, createdAt: now, updatedAt: now }
    const ref = await db.collection("repos").add(payload)

    await writeAuditLog({
      collection: "repos",
      docId: ref.id,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { repoSlug, clientId: body.clientId, projectId: body.projectId },
    })

    return NextResponse.json({ success: true, data: { id: ref.id, ...payload } })
  } catch (err) {
    console.error("POST /api/admin/repos:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
