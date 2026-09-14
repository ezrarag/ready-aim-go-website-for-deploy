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

    const contracts: BeamContract[] = [
      {
        id: "RAG-TFH-MW1",
        clientId: "together-for-homes",
        clientName: "Together for Homes",
        clientEmail: "info@togetherforhomes.org",
        workspaceId: "together-for-homes-permit-dashboard",
        title: "Together for Homes — Milwaukee Commercial Permit Dashboard",
        summary: "Commercial Development Permit Tracker & Automated Municipality Pipeline for City of Milwaukee Housing Development",
        contractType: "client_project",
        status: "active",
        monthlyValue: 0,
        totalContractValueCents: 750000,
        pricingCadence: "milestone",
        paymentDates: [
          "Milestone 1: Deposit / Kickoff — Permitting & Zoning Architecture",
          "Milestone 2: Alpha Release — Live Municipality API & Map Integration",
          "Milestone 3: Final Handover & Staff Training",
        ],
        milestoneAmountsCents: [250000, 250000, 250000],
        termMonths: 3,
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
        createdBy: "admin",
        documentUrl: null,
        beamNgos: ["forge", "grounds"],
        notes: "Milestone-based billing for Milwaukee municipal housing permitting dashboard.",
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
        createdBy: "admin",
        documentUrl: null,
        beamNgos: ["forge"],
        notes: "Full web platform build for Together for Homes.",
      },
    ]

    for (const contract of contracts) {
      await db.collection("contracts").doc(contract.id).set(contract, { merge: true })
    }

    const invoicesToSeed: ClientInvoice[] = [
      {
        id: "INV-TFH-001",
        clientId: "together-for-homes",
        workspaceId: "together-for-homes-permit-dashboard",
        contractId: "RAG-TFH-MW1",
        templateId: "client_milestone",
        invoiceNumber: "INV-TFH-001",
        title: "Permitting Dashboard — Milestone 1: Deposit / Kickoff",
        status: "client_review",
        issueDate: "2026-03-01T00:00:00.000Z",
        dueDate: "Upon receipt",
        billingPeriod: "Phase 1 Kickoff",
        from: {
          name: "ReadyAimGo Admin",
          company: "The Aranda Group / ReadyAimGo",
          address: "Milwaukee, WI",
          email: "billing@readyaimgo.biz",
        },
        billTo: {
          name: "Together For Homes Leadership",
          company: "Together For Homes",
          address: "Milwaukee, WI",
          email: "info@togetherforhomes.org",
        },
        lineItems: [
          {
            description: "Milestone 1: Deposit / Kickoff — Permitting & Zoning Architecture",
            period: "Phase 1",
            quantity: 1,
            rateCents: 250000,
            amountCents: 250000,
          },
        ],
        subtotalCents: 250000,
        taxLabel: "Sales tax",
        taxCents: 0,
        totalCents: 250000,
        installmentIndex: 0,
        milestoneLabel: "Milestone 1: Deposit / Kickoff — Permitting & Zoning Architecture",
        totalContractValueCents: 750000,
        paidToDateCents: 0,
        paymentMethods: { stripe: true, manual: true },
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "INV-TFH-002",
        clientId: "together-for-homes",
        workspaceId: "together-for-homes-permit-dashboard",
        contractId: "RAG-TFH-MW1",
        templateId: "client_milestone",
        invoiceNumber: "INV-TFH-002",
        title: "Permitting Dashboard — Milestone 2: Alpha Release & Municipality Integration",
        status: "draft",
        issueDate: "2026-04-01T00:00:00.000Z",
        dueDate: "2026-04-15T00:00:00.000Z",
        billingPeriod: "Phase 2 Alpha",
        from: {
          name: "ReadyAimGo Admin",
          company: "The Aranda Group / ReadyAimGo",
          address: "Milwaukee, WI",
          email: "billing@readyaimgo.biz",
        },
        billTo: {
          name: "Together For Homes Leadership",
          company: "Together For Homes",
          address: "Milwaukee, WI",
          email: "info@togetherforhomes.org",
        },
        lineItems: [
          {
            description: "Milestone 2: Alpha Release — Live Municipality API & Map Integration",
            period: "Phase 2",
            quantity: 1,
            rateCents: 250000,
            amountCents: 250000,
          },
        ],
        subtotalCents: 250000,
        taxLabel: "Sales tax",
        taxCents: 0,
        totalCents: 250000,
        installmentIndex: 1,
        milestoneLabel: "Milestone 2: Alpha Release — Live Municipality API & Map Integration",
        totalContractValueCents: 750000,
        paidToDateCents: 250000,
        paymentMethods: { stripe: true, manual: true },
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "INV-TFHS-001",
        clientId: "together-for-homes",
        workspaceId: "together-for-homes-site",
        contractId: "RAG-TFHS-MW1",
        templateId: "client_milestone",
        invoiceNumber: "INV-TFHS-001",
        title: "Website Build — Milestone 1: Project Deposit & Design System",
        status: "client_review",
        issueDate: "2026-03-05T00:00:00.000Z",
        dueDate: "Upon receipt",
        billingPeriod: "Phase 1 Kickoff",
        from: {
          name: "ReadyAimGo Admin",
          company: "The Aranda Group / ReadyAimGo",
          address: "Milwaukee, WI",
          email: "billing@readyaimgo.biz",
        },
        billTo: {
          name: "Together For Homes Leadership",
          company: "Together For Homes",
          address: "Milwaukee, WI",
          email: "info@togetherforhomes.org",
        },
        lineItems: [
          {
            description: "Milestone 1: Project Deposit & Design System Sign-off",
            period: "Phase 1",
            quantity: 1,
            rateCents: 400000,
            amountCents: 400000,
          },
        ],
        subtotalCents: 400000,
        taxLabel: "Sales tax",
        taxCents: 0,
        totalCents: 400000,
        installmentIndex: 0,
        milestoneLabel: "Milestone 1: Project Deposit & Design System Sign-off",
        totalContractValueCents: 1200000,
        paidToDateCents: 0,
        paymentMethods: { stripe: true, manual: true },
        createdAt: "2026-03-05T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
    ]

    for (const inv of invoicesToSeed) {
      const contract = contracts.find((c) => c.id === inv.contractId)
      const renderedHtml = await renderInvoiceHtml(inv, contract)
      await db
        .collection("clients")
        .doc(inv.clientId)
        .collection("invoices")
        .doc(inv.id)
        .set({ ...inv, renderedHtml }, { merge: true })
    }

    return NextResponse.json({
      success: true,
      message: "Seeded contracts and invoices for Together for Homes.",
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
