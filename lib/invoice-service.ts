import { readFile } from "node:fs/promises"
import path from "node:path"

import Stripe from "stripe"
import type { Firestore } from "firebase-admin/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { getInvoiceTemplate } from "@/lib/invoice-templates"
import type { ClientDeliverable } from "@/lib/types/client-billing"
import type { ClientInvoice, InvoiceLineItem, InvoiceParty } from "@/lib/types/client-invoices"

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : []
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function toLineItem(input: unknown): InvoiceLineItem | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  const record = input as Record<string, unknown>
  const description = readString(record.description) || ""
  if (!description) return null
  const quantity = readNumber(record.quantity) ?? 1
  const rateCents = readNumber(record.rateCents) ?? 0
  const amountCents = readNumber(record.amountCents) ?? quantity * rateCents
  return {
    description,
    period: readString(record.period) || "",
    quantity,
    rateCents,
    amountCents,
    notes: readString(record.notes),
  }
}

function toParty(input: unknown): InvoiceParty {
  const record = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {}
  return {
    name: readString(record.name) || "",
    company: readString(record.company) || "",
    address: readString(record.address) || "",
    email: readString(record.email) || "",
  }
}

export function normalizeInvoiceDocument(id: string, input: Record<string, unknown>): ClientInvoice {
  const serialized = serializeFirestoreDocument(id, input) as Record<string, unknown>
  const lineItems = Array.isArray(serialized.lineItems)
    ? serialized.lineItems.map((entry) => toLineItem(entry)).filter((entry): entry is InvoiceLineItem => Boolean(entry))
    : []
  const subtotalCents = readNumber(serialized.subtotalCents) ?? lineItems.reduce((sum, item) => sum + item.amountCents, 0)
  const taxCents = readNumber(serialized.taxCents) ?? 0
  return {
    id,
    clientId: readString(serialized.clientId) || "",
    workspaceId: readString(serialized.workspaceId),
    contractId: readString(serialized.contractId),
    deliverableId: readString(serialized.deliverableId),
    templateId: readString(serialized.templateId) || "contract_milestone",
    invoiceNumber: readString(serialized.invoiceNumber) || id,
    title: readString(serialized.title) || "Invoice",
    status: (readString(serialized.status) as ClientInvoice["status"]) || "draft",
    issueDate: readString(serialized.issueDate) || new Date().toISOString(),
    dueDate: readString(serialized.dueDate) || new Date().toISOString(),
    billingPeriod: readString(serialized.billingPeriod) || "",
    from: toParty(serialized.from),
    billTo: toParty(serialized.billTo),
    lineItems,
    subtotalCents,
    taxLabel: readString(serialized.taxLabel) || "Not applicable",
    taxCents,
    totalCents: readNumber(serialized.totalCents) ?? subtotalCents + taxCents,
    paymentLink: readString(serialized.paymentLink),
    renderedHtml: readString(serialized.renderedHtml),
    editableByClientFields: readStringArray(serialized.editableByClientFields),
    acceptedAt: readString(serialized.acceptedAt),
    paidAt: readString(serialized.paidAt),
    createdAt: readString(serialized.createdAt),
    updatedAt: readString(serialized.updatedAt),
    installmentIndex: typeof serialized.installmentIndex === "number" ? serialized.installmentIndex : null,
  }
}

function invoiceTemplatePath(fileName: string) {
  return path.join(process.cwd(), "docs", "invoices", fileName)
}

function buildMetaBlock(invoice: ClientInvoice) {
  return `<!-- meta row -->
  <div style="display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-top: 24px; break-inside: avoid;">
    <div>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #8a8a8a;">Issue date</div>
      <div style="font-size: 14px; color: #111827; margin-top: 4px;">${escapeHtml(formatDate(invoice.issueDate))}</div>
    </div>
    <div>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #8a8a8a;">Due date</div>
      <div style="font-size: 14px; color: #111827; margin-top: 4px;">${escapeHtml(formatDate(invoice.dueDate))}</div>
    </div>
    <div>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #8a8a8a;">Billing period</div>
      <div style="font-size: 14px; color: #111827; margin-top: 4px;">${escapeHtml(invoice.billingPeriod)}</div>
    </div>
  </div>

  <!-- from / bill to -->`
}

function buildPartyBlock(invoice: ClientInvoice) {
  const fromLines = [invoice.from.name, invoice.from.company, invoice.from.address, invoice.from.email].filter(Boolean)
  const billToLines = [invoice.billTo.name, invoice.billTo.company, invoice.billTo.address, invoice.billTo.email].filter(Boolean)
  return `<!-- from / bill to -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 34px; break-inside: avoid;">
    <div>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #8a8a8a;">From</div>
      <div style="font-size: 15px; color: #111827; margin-top: 8px; line-height: 1.6;">
        ${fromLines.map((line) => escapeHtml(line)).join("<br>\n        ")}
      </div>
    </div>
    <div>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #8a8a8a;">Bill to</div>
      <div style="font-size: 15px; color: #111827; margin-top: 8px; line-height: 1.6;">
        ${billToLines.map((line) => escapeHtml(line)).join("<br>\n        ")}
      </div>
    </div>
  </div>

  <!-- line items -->`
}

function buildLineItemsBlock(invoice: ClientInvoice) {
  const rows = invoice.lineItems.map((item) => `      <sc-raw-tr style="border-bottom: 1px solid #e5e5e5;">
        <sc-raw-td style="padding: 16px 0; font-size: 15px; color: #111827; vertical-align: top;">
          <div style="font-weight: 600;">${escapeHtml(item.description)}</div>
          ${item.notes ? `<div style="color: #666; font-size: 13px; margin-top: 4px;">${escapeHtml(item.notes)}</div>` : ""}
        </sc-raw-td>
        <sc-raw-td style="padding: 16px 0; font-size: 14px; color: #555; vertical-align: top;">${escapeHtml(item.period)}</sc-raw-td>
        <sc-raw-td style="padding: 16px 0; font-size: 14px; color: #555; text-align: center; vertical-align: top;">${escapeHtml(String(item.quantity))}</sc-raw-td>
        <sc-raw-td style="padding: 16px 0; font-size: 14px; color: #555; text-align: right; vertical-align: top;">${escapeHtml(formatCurrency(item.rateCents))}</sc-raw-td>
        <sc-raw-td style="padding: 16px 0; font-size: 15px; color: #111827; text-align: right; font-weight: 600; vertical-align: top;">${escapeHtml(formatCurrency(item.amountCents))}</sc-raw-td>
      </sc-raw-tr>`).join("\n")

  return `<!-- line items -->
  <sc-raw-table style="margin-top: 40px;">
    <sc-raw-thead>
      <sc-raw-tr style="border-bottom: 2px solid #111827;">
        <sc-raw-th style="text-align: left; padding: 0 0 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #8a8a8a; font-weight: 500;">Description</sc-raw-th>
        <sc-raw-th style="text-align: left; padding: 0 0 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #8a8a8a; font-weight: 500;">Period</sc-raw-th>
        <sc-raw-th style="text-align: center; padding: 0 0 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #8a8a8a; font-weight: 500;">Qty</sc-raw-th>
        <sc-raw-th style="text-align: right; padding: 0 0 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #8a8a8a; font-weight: 500;">Rate</sc-raw-th>
        <sc-raw-th style="text-align: right; padding: 0 0 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #8a8a8a; font-weight: 500;">Amount</sc-raw-th>
      </sc-raw-tr>
    </sc-raw-thead>
    <sc-raw-tbody>
${rows}
    </sc-raw-tbody>
  </sc-raw-table>

  <!-- totals -->`
}

function buildTotalsBlock(invoice: ClientInvoice) {
  return `<!-- totals -->
  <div style="display: flex; justify-content: flex-end; margin-top: 4px; break-inside: avoid;">
    <div style="width: 260px;">
      <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; color: #555;">
        <span>Subtotal</span><span>${escapeHtml(formatCurrency(invoice.subtotalCents))}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 12px; color: #999; border-bottom: 1px solid #e5e5e5;">
        <span>${escapeHtml(invoice.taxLabel || "Sales tax")}</span><span>${invoice.taxCents ? escapeHtml(formatCurrency(invoice.taxCents)) : "Not applicable"}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 14px 0 0; font-size: 19px; color: #111827; font-weight: 700;">
        <span>Total due</span><span style="color: #F97316;">${escapeHtml(formatCurrency(invoice.totalCents))}</span>
      </div>
    </div>
  </div>

  <!-- payment -->`
}

function buildPaymentBlock(invoice: ClientInvoice) {
  return `<!-- payment -->
  <div style="margin-top: 44px; padding: 22px 24px; background: #FBF7F2; border: 1px solid #f0e2d2; break-inside: avoid;">
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #8a8a8a;">Payment</div>
    <div style="font-size: 15px; color: #111827; margin-top: 8px; line-height: 1.6;">
      ${invoice.paymentLink
        ? `Pay securely by card via Stripe: <a href="${escapeHtml(invoice.paymentLink)}" style="font-weight: 600; text-decoration: underline;">${escapeHtml(invoice.paymentLink)}</a><br>
      <span style="color: #666; font-size: 13px;">Link is generated per invoice at checkout.</span>`
        : `Payment link will appear once this invoice is accepted and checkout is generated.<br>
      <span style="color: #666; font-size: 13px;">Admin and client can keep editing bill-to details until acceptance.</span>`}
    </div>
  </div>

  <!-- footer -->`
}

function replaceSection(html: string, startMarker: string, endMarker: string, replacement: string) {
  const start = html.indexOf(startMarker)
  const end = html.indexOf(endMarker)
  if (start === -1 || end === -1 || end <= start) return html
  return `${html.slice(0, start)}${replacement}${html.slice(end)}`
}

export async function renderInvoiceHtml(invoice: ClientInvoice) {
  const template = getInvoiceTemplate(invoice.templateId)
  if (!template) {
    throw new Error(`Unknown invoice template "${invoice.templateId}".`)
  }

  let html = await readFile(invoiceTemplatePath(template.fileName), "utf8")
  html = html.replaceAll(template.seedInvoiceNumber, invoice.invoiceNumber)
  html = replaceSection(html, "<!-- meta row -->", "<!-- from / bill to -->", buildMetaBlock(invoice))
  html = replaceSection(html, "<!-- from / bill to -->", "<!-- line items -->", buildPartyBlock(invoice))
  html = replaceSection(html, "<!-- line items -->", "<!-- totals -->", buildLineItemsBlock(invoice))
  html = replaceSection(html, "<!-- totals -->", "<!-- payment -->", buildTotalsBlock(invoice))
  html = replaceSection(html, "<!-- payment -->", "<!-- footer -->", buildPaymentBlock(invoice))
  return html
}

export function buildInvoiceNumber(templateId: string) {
  const prefix = getInvoiceTemplate(templateId)?.seedInvoiceNumber.split("-")[0] || "INVOICE"
  const now = new Date()
  return `${prefix}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`
}

export function buildDefaultInvoiceFromContract(input: {
  clientId: string
  workspaceId?: string | null
  contractId?: string | null
  templateId: string
  title: string
  amountCents: number
  billingPeriod: string
  issueDate: string
  dueDate: string
  from: InvoiceParty
  billTo: InvoiceParty
  description?: string
  installmentIndex?: number | null
}): Omit<ClientInvoice, "id"> {
  const template = getInvoiceTemplate(input.templateId)
  if (!template) {
    throw new Error(`Unknown invoice template "${input.templateId}".`)
  }
  const lineItems: InvoiceLineItem[] = [
    {
      description: input.description || template.defaultDescription,
      period: input.billingPeriod,
      quantity: 1,
      rateCents: input.amountCents,
      amountCents: input.amountCents,
    },
  ]
  const subtotalCents = input.amountCents
  return {
    clientId: input.clientId,
    workspaceId: input.workspaceId || null,
    contractId: input.contractId || null,
    deliverableId: null,
    templateId: input.templateId,
    invoiceNumber: buildInvoiceNumber(input.templateId),
    title: input.title,
    status: "client_review",
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    billingPeriod: input.billingPeriod,
    from: input.from,
    billTo: input.billTo,
    lineItems,
    subtotalCents,
    taxLabel: "Sales tax",
    taxCents: 0,
    totalCents: subtotalCents,
    paymentLink: null,
    renderedHtml: null,
    editableByClientFields: ["billTo.name", "billTo.company", "billTo.address", "billTo.email"],
    acceptedAt: null,
    paidAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    installmentIndex: input.installmentIndex !== undefined ? input.installmentIndex : null,
  }
}

export async function upsertInvoiceRender(
  db: Firestore,
  clientId: string,
  invoiceId: string
) {
  const ref = db.collection("clients").doc(clientId).collection("invoices").doc(invoiceId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new Error("Invoice not found.")
  }
  const invoice = normalizeInvoiceDocument(snap.id, snap.data() as Record<string, unknown>)
  const renderedHtml = await renderInvoiceHtml(invoice)
  await ref.set(
    {
      renderedHtml,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
  return { ...invoice, renderedHtml }
}

export async function ensureInvoiceDeliverable(
  db: Firestore,
  clientId: string,
  invoice: ClientInvoice
) {
  const collection = db.collection("clients").doc(clientId).collection("deliverables")
  if (invoice.deliverableId) {
    const existingRef = collection.doc(invoice.deliverableId)
    await existingRef.set(
      {
        workspaceId: invoice.workspaceId || null,
        title: invoice.title,
        summary: `Invoice ${invoice.invoiceNumber}`,
        amount: invoice.totalCents,
        invoiceId: invoice.id,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )
    return invoice.deliverableId
  }

  const ref = collection.doc()
  const now = new Date().toISOString()
  const payload: Omit<ClientDeliverable, "id"> & { invoiceId: string } = {
    clientId,
    workspaceId: invoice.workspaceId || null,
    projectId: null,
    title: invoice.title,
    summary: `Invoice ${invoice.invoiceNumber}`,
    liveUrl: "",
    screenshotUrls: [],
    amount: invoice.totalCents,
    status: "pending",
    invoiceId: invoice.id,
  }
  await ref.set({ ...payload, createdAt: now, updatedAt: now })
  await db.collection("clients").doc(clientId).collection("invoices").doc(invoice.id).set(
    {
      deliverableId: ref.id,
      updatedAt: now,
    },
    { merge: true }
  )
  return ref.id
}

export async function createInvoiceCheckoutSession(
  db: Firestore,
  input: {
    clientId: string
    invoiceId: string
    successUrl: string
    cancelUrl: string
  }
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe not configured")
  }

  const invoiceRef = db.collection("clients").doc(input.clientId).collection("invoices").doc(input.invoiceId)
  const invoiceSnap = await invoiceRef.get()
  if (!invoiceSnap.exists) {
    throw new Error("Invoice not found")
  }
  const invoice = normalizeInvoiceDocument(invoiceSnap.id, invoiceSnap.data() as Record<string, unknown>)
  const deliverableId = await ensureInvoiceDeliverable(db, input.clientId, invoice)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  })
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: invoice.totalCents,
          product_data: {
            name: invoice.title,
            description: `Invoice ${invoice.invoiceNumber}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      purpose: "deliverable_payment",
      clientId: input.clientId,
      deliverableId,
      invoiceId: invoice.id,
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  })

  await invoiceRef.set(
    {
      deliverableId,
      paymentLink: session.url,
      stripeSessionId: session.id,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )

  await db.collection("clients").doc(input.clientId).collection("deliverables").doc(deliverableId).set(
    {
      stripeSessionId: session.id,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )

  const refreshed = await upsertInvoiceRender(db, input.clientId, input.invoiceId)
  return {
    invoice: refreshed,
    sessionId: session.id,
    url: session.url,
  }
}
