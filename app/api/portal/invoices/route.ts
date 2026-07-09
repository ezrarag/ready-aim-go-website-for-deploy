import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { normalizeInvoiceDocument } from "@/lib/invoice-service"
import { resolvePortalIdentity } from "@/lib/portal-auth"

export async function GET(request: NextRequest) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const snap = await db
      .collection("clients")
      .doc(identity.activeClientId)
      .collection("invoices")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((doc) => normalizeInvoiceDocument(doc.id, doc.data() as Record<string, unknown>)),
    })
  } catch (error) {
    console.error("GET /api/portal/invoices:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
