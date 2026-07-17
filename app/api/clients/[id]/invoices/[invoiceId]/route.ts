import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { decodeRouteParam } from "@/lib/route-params"
import { normalizeInvoiceDocument, upsertInvoiceRender } from "@/lib/invoice-service"

type Params = { params: Promise<{ id: string; invoiceId: string }> }

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, invoiceId } = await context.params
    const clientId = decodeRouteParam(id)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("clients").doc(clientId).collection("invoices").doc(invoiceId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: normalizeInvoiceDocument(doc.id, doc.data() as Record<string, unknown>),
    })
  } catch (error) {
    console.error("GET /api/clients/[id]/invoices/[invoiceId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, invoiceId } = await context.params
    const clientId = decodeRouteParam(id)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }
    if ("title" in body) patch.title = readString(body.title)
    if ("billingPeriod" in body) patch.billingPeriod = readString(body.billingPeriod) || ""
    if ("issueDate" in body) patch.issueDate = readString(body.issueDate)
    if ("dueDate" in body) patch.dueDate = readString(body.dueDate)
    if ("status" in body) patch.status = readString(body.status)
    if ("paymentLink" in body) patch.paymentLink = readString(body.paymentLink)
    if ("billTo" in body && body.billTo && typeof body.billTo === "object") {
      patch.billTo = {
        name: readString((body.billTo as Record<string, unknown>).name) || "",
        company: readString((body.billTo as Record<string, unknown>).company) || "",
        address: readString((body.billTo as Record<string, unknown>).address) || "",
        email: readString((body.billTo as Record<string, unknown>).email) || "",
      }
    }
    if ("lineItems" in body && Array.isArray(body.lineItems)) {
      patch.lineItems = body.lineItems
      const subtotalCents = body.lineItems.reduce((sum, entry) => {
        const amount = readNumber((entry as Record<string, unknown>).amountCents) ?? 0
        return sum + amount
      }, 0)
      patch.subtotalCents = subtotalCents
      patch.totalCents = subtotalCents + (readNumber(body.taxCents) ?? 0)
    }
    if ("taxCents" in body) {
      patch.taxCents = readNumber(body.taxCents) ?? 0
      const existing = await db.collection("clients").doc(clientId).collection("invoices").doc(invoiceId).get()
      const invoice = existing.exists
        ? normalizeInvoiceDocument(existing.id, existing.data() as Record<string, unknown>)
        : null
      patch.totalCents = (invoice?.subtotalCents ?? 0) + (patch.taxCents as number)
    }
    if ("allocation" in body) {
      if (body.allocation && typeof body.allocation === "object") {
        patch.allocation = {
          directedTo: readString((body.allocation as Record<string, unknown>).directedTo) || "as_invoiced",
          amountCents: readNumber((body.allocation as Record<string, unknown>).amountCents) || 0,
          allocatedAt: readString((body.allocation as Record<string, unknown>).allocatedAt) || new Date().toISOString(),
          clientNote: readString((body.allocation as Record<string, unknown>).clientNote) || null,
          clientFeedbackStatus: readString((body.allocation as Record<string, unknown>).clientFeedbackStatus) || "pending",
        }
      } else {
        patch.allocation = null
      }
    }


    await db.collection("clients").doc(clientId).collection("invoices").doc(invoiceId).set(patch, { merge: true })
    const rendered = await upsertInvoiceRender(db, clientId, invoiceId)
    return NextResponse.json({ success: true, data: rendered })
  } catch (error) {
    console.error("PATCH /api/clients/[id]/invoices/[invoiceId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
