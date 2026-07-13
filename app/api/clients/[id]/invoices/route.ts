import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { decodeRouteParam } from "@/lib/route-params"
import { buildDefaultInvoiceFromContract, normalizeInvoiceDocument, upsertInvoiceRender } from "@/lib/invoice-service"

type Params = { params: Promise<{ id: string }> }

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const clientId = decodeRouteParam(id)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const snap = await db
      .collection("clients")
      .doc(clientId)
      .collection("invoices")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((doc) => normalizeInvoiceDocument(doc.id, doc.data() as Record<string, unknown>)),
    })
  } catch (error) {
    console.error("GET /api/clients/[id]/invoices:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const clientId = decodeRouteParam(id)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const title = readString(body.title)
    const templateId = readString(body.templateId)
    if (!title || !templateId) {
      return NextResponse.json({ success: false, error: "title and templateId are required" }, { status: 400 })
    }

    const rawIndex = body.installmentIndex
    const installmentIndex = typeof rawIndex === "number" ? rawIndex : (typeof rawIndex === "string" ? parseInt(rawIndex, 10) : null)

    const invoice = buildDefaultInvoiceFromContract({
      clientId,
      workspaceId: readString(body.workspaceId) || null,
      contractId: readString(body.contractId) || null,
      templateId,
      title,
      amountCents: readNumber(body.amountCents),
      billingPeriod: readString(body.billingPeriod) || "",
      issueDate: readString(body.issueDate) || new Date().toISOString(),
      dueDate: readString(body.dueDate) || new Date().toISOString(),
      from: {
        name: readString(body.fromName) || "ReadyAimGo",
        company: readString(body.fromCompany) || "Ezra Haugabrooks, sole operator",
        address: readString(body.fromAddress) || "Milwaukee, WI",
        email: readString(body.fromEmail) || "support@readyaimgo.biz",
      },
      billTo: {
        name: readString(body.billToName) || "",
        company: readString(body.billToCompany) || "",
        address: readString(body.billToAddress) || "",
        email: readString(body.billToEmail) || "",
      },
      description: readString(body.description) || undefined,
      installmentIndex: Number.isNaN(installmentIndex) ? null : installmentIndex,
    })

    const ref = db.collection("clients").doc(clientId).collection("invoices").doc()
    await ref.set(invoice)
    const rendered = await upsertInvoiceRender(db, clientId, ref.id)
    return NextResponse.json({ success: true, data: { ...rendered, id: ref.id } }, { status: 201 })
  } catch (error) {
    console.error("POST /api/clients/[id]/invoices:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
