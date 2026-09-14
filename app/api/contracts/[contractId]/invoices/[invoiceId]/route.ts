import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { renderInvoiceHtml } from "@/lib/invoice-renderer.server"
import { normalizeInvoiceDocument } from "@/lib/invoice-service"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ contractId: string; invoiceId: string }> }

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { contractId, invoiceId } = await context.params
    const db = getAdminDb()

    const snap = await db.collectionGroup("invoices").get()
    const match = snap.docs.find((d) => d.id === invoiceId || d.data().contractId === contractId)

    if (!match) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 })
    }

    const invoice = normalizeInvoiceDocument(match.id, match.data() as Record<string, unknown>)
    return NextResponse.json({ success: true, data: invoice, invoice })
  } catch (error) {
    console.error("GET /api/contracts/[contractId]/invoices/[invoiceId] error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load invoice." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { contractId, invoiceId } = await context.params
    const db = getAdminDb()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const snap = await db.collectionGroup("invoices").get()
    const match = snap.docs.find((d) => d.id === invoiceId || d.id.includes(invoiceId))

    if (!match) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 })
    }

    const docRef = match.ref
    const currentInvoice = normalizeInvoiceDocument(match.id, match.data() as Record<string, unknown>)

    const now = new Date().toISOString()
    const updatedStatus = typeof body.status === "string" ? body.status : currentInvoice.status
    const paidAt = updatedStatus === "paid" ? (currentInvoice.paidAt || now) : (body.paidAt !== undefined ? (body.paidAt as string | null) : currentInvoice.paidAt)

    const updatedInvoice: typeof currentInvoice = {
      ...currentInvoice,
      status: updatedStatus as any,
      paidAt,
      billTo: body.billTo && typeof body.billTo === "object" ? { ...currentInvoice.billTo, ...(body.billTo as any) } : currentInvoice.billTo,
      updatedAt: now,
    }

    // Regenerate HTML preview
    const renderedHtml = await renderInvoiceHtml(updatedInvoice)
    updatedInvoice.renderedHtml = renderedHtml

    await docRef.set(updatedInvoice, { merge: true })

    return NextResponse.json({ success: true, data: updatedInvoice, invoice: updatedInvoice })
  } catch (error) {
    console.error("PATCH /api/contracts/[contractId]/invoices/[invoiceId] error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update invoice." },
      { status: 500 }
    )
  }
}
