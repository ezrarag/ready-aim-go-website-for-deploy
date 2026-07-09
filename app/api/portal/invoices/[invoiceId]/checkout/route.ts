import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { createInvoiceCheckoutSession, normalizeInvoiceDocument } from "@/lib/invoice-service"
import { resolvePortalIdentity } from "@/lib/portal-auth"

type Params = { params: Promise<{ invoiceId: string }> }

export async function POST(request: NextRequest, context: Params) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { invoiceId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const invoiceRef = db.collection("clients").doc(identity.activeClientId).collection("invoices").doc(invoiceId)
    const invoiceSnap = await invoiceRef.get()
    if (!invoiceSnap.exists) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 })
    }
    const invoice = normalizeInvoiceDocument(invoiceSnap.id, invoiceSnap.data() as Record<string, unknown>)
    if (invoice.status !== "accepted" && invoice.status !== "client_review") {
      return NextResponse.json({ success: false, error: "Invoice is not payable in its current state" }, { status: 409 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const successUrl =
      typeof body.successUrl === "string"
        ? body.successUrl
        : `${request.nextUrl.origin}/dashboard/client`
    const cancelUrl =
      typeof body.cancelUrl === "string"
        ? body.cancelUrl
        : `${request.nextUrl.origin}/dashboard/client`

    const data = await createInvoiceCheckoutSession(db, {
      clientId: identity.activeClientId,
      invoiceId,
      successUrl,
      cancelUrl,
    })

    await invoiceRef.set(
      {
        status: "accepted",
        acceptedAt: invoice.acceptedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("POST /api/portal/invoices/[invoiceId]/checkout:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
