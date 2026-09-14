import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

if (!getApps().length) {
  initializeApp()
}

const db = getFirestore()

async function auditAndSeed() {
  console.log("Starting audit and seed for Together for Homes...")

  const clientRef = db.collection("clients").doc("together-for-homes")

  // 1. Audit and remove stale test invoices
  const existingInvoicesSnap = await clientRef.collection("invoices").get()
  for (const doc of existingInvoicesSnap.docs) {
    if (doc.id.startsWith("INV-TFH-") || doc.id === "INV-TFHS-001") {
      console.log(`Purging stale test invoice doc: ${doc.id}`)
      await doc.ref.delete()
    }
  }

  // 2. Canonical Contract RAG-TFH-MW1
  const tfhContract = {
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
    milestoneAmountsCents: [100000, 100000, 100000],
    termMonths: 3,
    startDate: "2026-07-09T00:00:00.000Z",
    endDate: "2026-10-09T00:00:00.000Z",
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    createdBy: "Ezra Haugabrooks, sole operator",
    documentUrl: null,
    beamNgos: ["forge", "grounds"],
    notes: "Official milestone agreement with 1000 Friends of Wisconsin / Together for Homes.",
  }

  await db.collection("contracts").doc("RAG-TFH-MW1").set(tfhContract, { merge: true })
  console.log("Synced contract RAG-TFH-MW1 ($3,000 total).")

  // 3. Official Paid Invoice #1 matching PDF
  const paidInvoice1 = {
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
  }

  await clientRef.collection("invoices").doc("RAG-TFH-MW1-1").set(paidInvoice1, { merge: true })
  console.log("Synced paid invoice #1 (RAG-TFH-MW1-1) for $1,000.00.")

  console.log("Audit and seed finished successfully.")
}

auditAndSeed().catch(console.error)
