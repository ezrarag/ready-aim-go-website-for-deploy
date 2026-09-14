import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { renderInvoiceHtml } from "@/lib/invoice-renderer.server"
import type { ClientInvoice } from "@/lib/invoices"
import type { BeamContract } from "@/lib/contracts"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getAdminDb()

    // 1. Audit & purge any obsolete or duplicate test invoices for together-for-homes
    const clientRef = db.collection("clients").doc("together-for-homes")
    const existingInvoicesSnap = await clientRef.collection("invoices").get()

    for (const doc of existingInvoicesSnap.docs) {
      // Keep only official invoice ID RAG-TFH-MW1-1 if already correct, purge old draft test IDs
      if (doc.id.startsWith("INV-TFH-") || doc.id === "INV-TFHS-001") {
        await doc.ref.delete()
      }
    }

    // 2. Define canonical Together for Homes contract matching official PDF invoice
    const contracts: BeamContract[] = [
      {
        id: "RAG-TFH-MW1",
        clientId: "together-for-homes",
        clientName: "Together for Homes (1000 Friends of Wisconsin)",
        clientEmail: "friends@1kfriends.org",
        workspaceId: "together-for-homes-permit-dashboard",
        title: "Together For Homes — Permit Dashboard",
        summary: "Commercial Development Permit Tracker & Automated Municipality Pipeline for City of Milwaukee Housing Development",
        contractType: "client_project",
        status: "active",
        monthlyValue: 0,
        totalContractValueCents: 300000, // $3,000.00
        pricingCadence: "milestone",
        paymentDates: [
          "1. Signing",
          "2. Prototype delivery",
          "3. Final delivery",
        ],
        milestoneAmountsCents: [100000, 100000, 100000], // 3 x $1,000.00
        termMonths: 3,
        startDate: "2026-07-09T00:00:00.000Z",
        endDate: "2026-10-09T00:00:00.000Z",
        createdAt: "2026-07-09T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
        createdBy: "Ezra Haugabrooks, sole operator",
        documentUrl: null,
        beamNgos: ["forge", "grounds"],
        notes: "Official milestone agreement with 1000 Friends of Wisconsin / Together for Homes.",
      },
      {
        id: "RAG-TFHS-MW1",
        clientId: "together-for-homes",
        clientName: "Together for Homes",
        clientEmail: "info@togetherforhomes.org",
        workspaceId: "together-for-homes-site",
        title: "Together for Homes — Website & Client Portal Build",
        summary: "Full Website, Donor Portal, and Housing Impact Showcase Platform",
        contractType: "client_project",
        status: "active",
        monthlyValue: 0,
        totalContractValueCents: 1200000,
        pricingCadence: "milestone",
        paymentDates: [
          "Milestone 1: Project Deposit & Design System Sign-off",
          "Milestone 2: Complete CMS, Web Application & Interactive Map",
          "Milestone 3: Staging Verification & Production Launch",
        ],
        milestoneAmountsCents: [400000, 400000, 400000],
        termMonths: 3,
        startDate: "2026-03-05T00:00:00.000Z",
        endDate: "2026-06-05T00:00:00.000Z",
        createdAt: "2026-03-05T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
        createdBy: "Ezra Haugabrooks, sole operator",
        documentUrl: null,
        beamNgos: ["forge"],
        notes: "Full web platform build for Together for Homes.",
      },
    ]

    for (const contract of contracts) {
      await db.collection("contracts").doc(contract.id).set(contract, { merge: true })
    }

    // 3. Official Paid Invoice #1 for RAG-TFH-MW1 matching PDF
    const invoicesToSeed: ClientInvoice[] = [
      {
        id: "RAG-TFH-MW1-1",
        clientId: "together-for-homes",
        workspaceId: "together-for-homes-permit-dashboard",
        contractId: "RAG-TFH-MW1",
        templateId: "client_milestone",
        invoiceNumber: "RAG-TFH-MW1",
        title: "Together For Homes — Permit Dashboard",
        status: "paid",
        issueDate: "2026-07-09T00:00:00.000Z",
        dueDate: "Upon receipt",
        billingPeriod: "Milestone 1",
        from: {
          name: "ReadyAimGo",
          company: "Ezra Haugabrooks, sole operator",
          address: "Milwaukee, WI",
          email: "support@readyaimgo.biz",
        },
        billTo: {
          name: "1000 Friends of Wisconsin",
          company: "Attn: Solana Patterson-Ramos, Advocacy Manager",
          address: "P.O. Box 25, Stevens Point, WI 54481",
          email: "friends@1kfriends.org",
        },
        lineItems: [
          {
            description: "1. Signing",
            period: "Milestone 1",
            quantity: 1,
            rateCents: 100000,
            amountCents: 100000,
          },
        ],
        subtotalCents: 100000,
        taxLabel: "Sales tax",
        taxCents: 0,
        totalCents: 100000,
        installmentIndex: 0,
        milestoneLabel: "1. Signing",
        totalContractValueCents: 300000,
        paidToDateCents: 100000,
        paidAt: "2026-07-09T00:00:00.000Z",
        paymentMethods: { stripe: true, manual: true },
        createdAt: "2026-07-09T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
    ]

    for (const inv of invoicesToSeed) {
      const contract = contracts.find((c) => c.id === inv.contractId)
      const renderedHtml = await renderInvoiceHtml(inv, contract)
      
      // Save primary doc RAG-TFH-MW1-1
      await db
        .collection("clients")
        .doc(inv.clientId)
        .collection("invoices")
        .doc(inv.id)
        .set({ ...inv, renderedHtml }, { merge: true })

      // Save secondary alias doc RAG-TFH-MW1 for cross-app parity with clients.readyaimgo.biz
      await db
        .collection("clients")
        .doc(inv.clientId)
        .collection("invoices")
        .doc(inv.contractId)
        .set({ ...inv, id: inv.contractId, renderedHtml }, { merge: true })
    }

    return NextResponse.json({
      success: true,
      message: "Audited and seeded official Together for Homes contract and paid invoice #1.",
      seededContractIds: contracts.map((c) => c.id),
      seededInvoiceIds: invoicesToSeed.map((i) => i.id),
    })
  } catch (error) {
    console.error("POST /api/admin/seed-contracts error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to seed contracts." },
      { status: 500 }
    )
  }
}
