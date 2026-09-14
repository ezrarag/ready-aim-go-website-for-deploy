import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { renderInvoiceHtml } from "@/lib/invoice-renderer.server"
import { normalizeContract } from "@/lib/contracts"
import type { ClientInvoice } from "@/lib/invoices"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ contractId: string }> }

export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { contractId } = await context.params
    const db = getAdminDb()

    const contractSnap = await db.collection("contracts").doc(contractId).get()
    if (!contractSnap.exists) {
      return NextResponse.json({ success: false, error: "Contract not found." }, { status: 404 })
    }

    const contract = normalizeContract(contractSnap.id, contractSnap.data() as Record<string, unknown>)
    if (!contract.clientId) {
      return NextResponse.json({ success: false, error: "Contract is missing clientId." }, { status: 400 })
    }

    // Query existing invoices for this contract
    const existingInvoicesSnap = await db
      .collection("clients")
      .doc(contract.clientId)
      .collection("invoices")
      .where("contractId", "==", contractId)
      .get()

    const existingInvoices = existingInvoicesSnap.docs.map((doc) => doc.data())
    const existingIndexes = new Set<number>()
    let paidToDateCents = 0

    for (const inv of existingInvoices) {
      if (typeof inv.installmentIndex === "number") {
        existingIndexes.add(inv.installmentIndex)
      }
      if (inv.status === "paid" && typeof inv.totalCents === "number") {
        paidToDateCents += inv.totalCents
      }
    }

    const milestones = (contract.paymentDates && contract.paymentDates.length > 0)
      ? contract.paymentDates
      : ["Milestone 1"]
    const milestoneAmounts = contract.milestoneAmountsCents || []

    // Find next installment index
    let nextIndex = 0
    while (existingIndexes.has(nextIndex) && nextIndex < milestones.length) {
      nextIndex++
    }

    if (nextIndex >= milestones.length) {
      return NextResponse.json(
        { success: false, error: "All contract milestones have already been invoiced." },
        { status: 400 }
      )
    }

    const milestoneLabel = milestones[nextIndex] || `Milestone ${nextIndex + 1}`
    const milestoneAmountCents = milestoneAmounts[nextIndex] ?? Math.round((contract.totalContractValueCents || 0) / milestones.length)
    const invoiceId = `INV-${contract.clientId.toUpperCase()}-${nextIndex + 1}`

    const now = new Date().toISOString()
    const invoice: ClientInvoice = {
      id: invoiceId,
      clientId: contract.clientId,
      workspaceId: contract.workspaceId || null,
      contractId: contract.id,
      templateId: "client_milestone",
      invoiceNumber: invoiceId,
      title: `${contract.title} — ${milestoneLabel}`,
      status: "client_review",
      issueDate: now,
      dueDate: "Upon receipt",
      billingPeriod: `Milestone ${nextIndex + 1}`,
      from: {
        name: "ReadyAimGo Admin",
        company: "The Aranda Group / ReadyAimGo",
        address: "Milwaukee, WI",
        email: "billing@readyaimgo.biz",
      },
      billTo: {
        name: contract.clientName || "Client",
        company: contract.clientName || "Client Company",
        address: "Milwaukee, WI",
        email: contract.clientEmail || "",
      },
      lineItems: [
        {
          description: milestoneLabel,
          period: `Milestone ${nextIndex + 1}`,
          quantity: 1,
          rateCents: milestoneAmountCents,
          amountCents: milestoneAmountCents,
        },
      ],
      subtotalCents: milestoneAmountCents,
      taxLabel: "Sales tax",
      taxCents: 0,
      totalCents: milestoneAmountCents,
      installmentIndex: nextIndex,
      milestoneLabel,
      totalContractValueCents: contract.totalContractValueCents || milestoneAmountCents,
      paidToDateCents,
      paymentMethods: { stripe: true, manual: true },
      createdAt: now,
      updatedAt: now,
    }

    const renderedHtml = await renderInvoiceHtml(invoice, contract)
    invoice.renderedHtml = renderedHtml

    await db
      .collection("clients")
      .doc(contract.clientId)
      .collection("invoices")
      .doc(invoice.id)
      .set(invoice, { merge: true })

    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    console.error("POST /api/contracts/[contractId]/generate-invoice error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate invoice." },
      { status: 500 }
    )
  }
}
