import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { renderInvoiceHtml } from "@/lib/invoice-renderer.server"
import { normalizeContract } from "@/lib/contracts"
import type { ClientInvoice } from "@/lib/invoices"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/command/sms
 *
 * iMessage / SMS Command Gateway for ReadyAimGo.
 * Accepts text commands from mobile (via Twilio, Apple Messages for Business, or raCommand iMessage Bridge)
 * and executes real actions:
 *   - "invoice tfh milestone 2" -> Generates next milestone invoice
 *   - "status tfh" -> Returns live client login activity, workspace state & invoice balances
 *   - "new client Acme Corp john@acme.com" -> Provisions new client & workspace
 */
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const contentType = request.headers.get("content-type") || ""
    let bodyText = ""
    let senderPhone = ""

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      bodyText = (formData.get("Body") || formData.get("text") || "").toString().trim()
      senderPhone = (formData.get("From") || formData.get("sender") || "").toString().trim()
    } else {
      const json = await request.json().catch(() => ({}))
      bodyText = (json.text || json.Body || json.command || "").toString().trim()
      senderPhone = (json.sender || json.From || "").toString().trim()
    }

    if (!bodyText) {
      return NextResponse.json({ success: false, error: "Text command body is required." }, { status: 400 })
    }

    const db = getAdminDb()
    const lower = bodyText.toLowerCase()
    let textResponse = ""
    let actionTaken = ""
    let actionData: Record<string, unknown> = {}

    // COMMAND 1: Generate Invoice (e.g. "invoice tfh", "invoice tfh milestone 2")
    if (lower.startsWith("invoice")) {
      actionTaken = "generate_invoice"
      let contractId = "RAG-TFH-MW1"
      if (lower.includes("tfh") || lower.includes("together")) {
        contractId = "RAG-TFH-MW1"
      }

      const contractSnap = await db.collection("contracts").doc(contractId).get()
      if (!contractSnap.exists) {
        textResponse = `❌ Contract ${contractId} not found.`
      } else {
        const contract = normalizeContract(contractSnap.id, contractSnap.data() as Record<string, unknown>)
        
        // Find existing invoices
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
          if (typeof inv.installmentIndex === "number") existingIndexes.add(inv.installmentIndex)
          if (inv.status === "paid" && typeof inv.totalCents === "number") paidToDateCents += inv.totalCents
        }

        const milestones = contract.paymentDates || ["Milestone 1"]
        const amounts = contract.milestoneAmountsCents || []

        let nextIndex = 0
        while (existingIndexes.has(nextIndex) && nextIndex < milestones.length) {
          nextIndex++
        }

        if (nextIndex >= milestones.length) {
          textResponse = `⚠️ All milestones for ${contract.title} have already been invoiced!`
        } else {
          const milestoneLabel = milestones[nextIndex] || `Milestone ${nextIndex + 1}`
          const milestoneAmountCents = amounts[nextIndex] ?? Math.round((contract.totalContractValueCents || 0) / milestones.length)
          const invoiceId = `${contractId}-${nextIndex + 1}`

          const now = new Date().toISOString()
          const invoice: ClientInvoice = {
            id: invoiceId,
            clientId: contract.clientId,
            workspaceId: contract.workspaceId || null,
            contractId: contract.id,
            templateId: "client_milestone",
            invoiceNumber: contractId,
            title: contract.title,
            status: "client_review",
            issueDate: now,
            dueDate: "Upon receipt",
            billingPeriod: `Milestone ${nextIndex + 1}`,
            from: {
              name: "ReadyAimGo",
              company: "Ezra Haugabrooks, sole operator",
              address: "Milwaukee, WI",
              email: "support@readyaimgo.biz",
            },
            billTo: {
              name: "1000 Friends of Wisconsin",
              company: contract.clientName || "Attn: Solana Patterson-Ramos, Advocacy Manager",
              address: "P.O. Box 25, Stevens Point, WI 54481",
              email: contract.clientEmail || "friends@1kfriends.org",
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

          actionData = { invoiceId: invoice.id, amountCents: milestoneAmountCents }
          textResponse = `✅ Generated Invoice ${invoice.id} ($${(milestoneAmountCents / 100).toFixed(2)}) for ${contract.title} (${milestoneLabel})!\nPDF Link: https://readyaimgo.biz/admin/invoices/${encodeURIComponent(invoice.id)}/print`
        }
      }

    // COMMAND 2: Status Query (e.g. "status tfh", "status together")
    } else if (lower.startsWith("status")) {
      actionTaken = "client_status"
      let clientId = "together-for-homes"
      if (lower.includes("tfh") || lower.includes("together")) {
        clientId = "together-for-homes"
      }

      const clientSnap = await db.collection("clients").doc(clientId).get()
      const invoicesSnap = await db.collection("clients").doc(clientId).collection("invoices").get()

      const clientData = clientSnap.data() || {}
      const invList = invoicesSnap.docs.map((d) => d.data())

      const totalBilled = invList.reduce((acc, i) => acc + (i.totalCents || 0), 0)
      const totalPaid = invList.filter((i) => i.status === "paid").reduce((acc, i) => acc + (i.totalCents || 0), 0)
      const outstanding = totalBilled - totalPaid

      textResponse = `📊 Client Status: ${clientData.name || clientId}\n` +
        `• Active Workspace: ${clientData.workspaceId || "together-for-homes-permit-dashboard"}\n` +
        `• Invoices Total: $${(totalBilled / 100).toFixed(2)}\n` +
        `• Total Paid: $${(totalPaid / 100).toFixed(2)}\n` +
        `• Outstanding Balance: $${(outstanding / 100).toFixed(2)}\n` +
        `• Client Email: ${clientData.email || "friends@1kfriends.org"}`

      actionData = { clientId, totalBilled, totalPaid, outstanding }

    // COMMAND 3: New Client Provisioning (e.g. "new client Acme Corp info@acme.com")
    } else if (lower.startsWith("new client")) {
      actionTaken = "provision_client"
      const parts = bodyText.split(" ")
      const name = parts.slice(2, -1).join(" ") || "New Client Entity"
      const email = parts[parts.length - 1]?.includes("@") ? parts[parts.length - 1] : "client@readyaimgo.biz"
      const clientId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")

      const now = new Date().toISOString()
      await db.collection("clients").doc(clientId).set({
        id: clientId,
        name,
        email,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }, { merge: true })

      textResponse = `🚀 Provisioned new client: ${name} (ID: ${clientId})\nEmail: ${email}\nClient Portal: https://clients.readyaimgo.biz`
      actionData = { clientId, name, email }

    // DEFAULT / UNKNOWN COMMAND
    } else {
      textResponse = `🤖 ReadyAimGo Command Agent:\nAvailable commands:\n• "invoice tfh" -> Generate next milestone invoice\n• "status tfh" -> Client login & billing report\n• "new client [Name] [email]" -> Provision client`
    }

    return NextResponse.json({
      success: true,
      sender: senderPhone,
      commandText: bodyText,
      actionTaken,
      textResponse,
      actionData,
    })
  } catch (error) {
    console.error("POST /api/admin/command/sms error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Command processing failed." },
      { status: 500 }
    )
  }
}
