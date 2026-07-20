import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : null
    const amountCents = typeof body.amountCents === "number" && Number.isFinite(body.amountCents) ? body.amountCents : null
    const applePayToken = body.applePayToken || body.paymentData || null
    const senderName = typeof body.senderName === "string" ? body.senderName.trim() : "Apple Pay Customer"
    const statementOfPurpose = typeof body.statementOfPurpose === "string" ? body.statementOfPurpose.trim() : "Apple Pay Escrow Deposit"

    if (!clientId) {
      return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 })
    }
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ success: false, error: "amountCents must be a positive number" }, { status: 400 })
    }

    const clientRef = db.collection("clients").doc(clientId)
    const clientSnap = await clientRef.get()
    if (!clientSnap.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const clientData = clientSnap.data() || {}
    let currentBalanceCents = typeof clientData.retainerBalanceCents === "number"
      ? clientData.retainerBalanceCents
      : typeof clientData.retainerBalance === "number"
      ? Math.round(clientData.retainerBalance * 100)
      : 0

    const nextBalanceCents = currentBalanceCents + amountCents
    const nowIso = new Date().toISOString()
    const ledgerRef = clientRef.collection("retainerLedger").doc()

    const transactionData = {
      id: ledgerRef.id,
      clientId,
      type: "deposit",
      amountCents,
      channel: "apple_pay",
      senderOrPurpose: `Apple Pay: ${senderName}`,
      statementOfPurpose,
      applePayToken: applePayToken ? "[VERIFIED_APPLE_PAY_TOKEN]" : null,
      createdByName: "Apple Pay Processing Engine",
      createdAt: nowIso,
      balanceAfterCents: nextBalanceCents,
    }

    await ledgerRef.set(transactionData)

    await clientRef.set(
      {
        retainerBalanceCents: nextBalanceCents,
        retainerBalance: nextBalanceCents / 100,
        retainer: {
          ...(clientData.retainer || {}),
          amountTotal: nextBalanceCents / 100,
          currency: "usd",
          active: true,
          updatedAt: nowIso,
        },
        updatedAt: nowIso,
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      data: transactionData,
      nextBalanceCents,
      message: `Apple Pay payment of $${(amountCents / 100).toFixed(2)} deposited successfully into Retainer Vault.`,
    })
  } catch (error) {
    console.error("POST /api/admin/payments/apple-pay error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Apple Pay ingestion error" },
      { status: 500 }
    )
  }
}
