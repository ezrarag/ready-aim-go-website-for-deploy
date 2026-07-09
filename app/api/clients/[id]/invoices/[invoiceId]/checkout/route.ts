import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { createInvoiceCheckoutSession } from "@/lib/invoice-service"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { decodeRouteParam } from "@/lib/route-params"

type Params = { params: Promise<{ id: string; invoiceId: string }> }

export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, invoiceId } = await context.params
    const clientId = decodeRouteParam(id)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const successUrl =
      typeof body.successUrl === "string"
        ? body.successUrl
        : `${request.nextUrl.origin}/dashboard/client?section=financial`
    const cancelUrl =
      typeof body.cancelUrl === "string"
        ? body.cancelUrl
        : `${request.nextUrl.origin}/dashboard/client?section=financial`

    const data = await createInvoiceCheckoutSession(db, {
      clientId,
      invoiceId,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("POST /api/clients/[id]/invoices/[invoiceId]/checkout:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
