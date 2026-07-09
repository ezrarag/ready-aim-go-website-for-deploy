import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { normalizeInvoiceDocument, upsertInvoiceRender } from "@/lib/invoice-service"
import { resolvePortalIdentity } from "@/lib/portal-auth"

type Params = { params: Promise<{ invoiceId: string }> }

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function GET(request: NextRequest, context: Params) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { invoiceId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("clients").doc(identity.activeClientId).collection("invoices").doc(invoiceId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: normalizeInvoiceDocument(doc.id, doc.data() as Record<string, unknown>),
    })
  } catch (error) {
    console.error("GET /api/portal/invoices/[invoiceId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  const identity = await resolvePortalIdentity(request)
  if (!identity) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { invoiceId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("clients").doc(identity.activeClientId).collection("invoices").doc(invoiceId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 })
    }

    const invoice = normalizeInvoiceDocument(snap.id, snap.data() as Record<string, unknown>)
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return NextResponse.json({ success: false, error: "Invoice is no longer editable" }, { status: 409 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }

    if ("accept" in body && body.accept === true) {
      patch.status = "accepted"
      patch.acceptedAt = new Date().toISOString()
    }

    if ("billTo" in body && body.billTo && typeof body.billTo === "object") {
      const allowed = new Set(invoice.editableByClientFields || [])
      const nextBillTo = { ...invoice.billTo }
      const billTo = body.billTo as Record<string, unknown>
      if (allowed.has("billTo.name")) nextBillTo.name = readString(billTo.name) || ""
      if (allowed.has("billTo.company")) nextBillTo.company = readString(billTo.company) || ""
      if (allowed.has("billTo.address")) nextBillTo.address = readString(billTo.address) || ""
      if (allowed.has("billTo.email")) nextBillTo.email = readString(billTo.email) || ""
      patch.billTo = nextBillTo
    }

    await ref.set(patch, { merge: true })
    const rendered = await upsertInvoiceRender(db, identity.activeClientId, invoiceId)
    return NextResponse.json({ success: true, data: rendered })
  } catch (error) {
    console.error("PATCH /api/portal/invoices/[invoiceId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
