import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { normalizeInvoiceDocument } from "@/lib/invoice-service"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/invoices
 *
 * Lists invoices across all clients. Invoices live at
 * clients/{clientId}/invoices/{invoiceId}, so this uses a Firestore
 * collection-group query. Filtering and sorting happen in memory rather
 * than via Firestore where/orderBy so this doesn't require deploying a new
 * collection-group index.
 *
 * Query params: clientId?, workspaceId?, status?, limit? (default 100, max 300)
 */
export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")?.trim()
    const workspaceId = searchParams.get("workspaceId")?.trim()
    const status = searchParams.get("status")?.trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 300)

    const snapshot = await db.collectionGroup("invoices").limit(500).get()

    let invoices = snapshot.docs.map((doc) =>
      normalizeInvoiceDocument(doc.id, doc.data() as Record<string, unknown>)
    )

    if (clientId) invoices = invoices.filter((invoice) => invoice.clientId === clientId)
    if (workspaceId) invoices = invoices.filter((invoice) => invoice.workspaceId === workspaceId)
    if (status) invoices = invoices.filter((invoice) => invoice.status === status)

    invoices.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

    return NextResponse.json({ success: true, data: invoices.slice(0, limit) })
  } catch (error) {
    console.error("GET /api/admin/invoices error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load invoices." },
      { status: 500 }
    )
  }
}
