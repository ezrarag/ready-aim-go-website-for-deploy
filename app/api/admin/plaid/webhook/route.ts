import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const webhookType = body.webhook_type
    const webhookCode = body.webhook_code

    console.log(`Plaid Webhook received: ${webhookType} / ${webhookCode}`)

    // When Plaid syncs new transactions from CashApp / Bank account
    if (webhookType === "TRANSACTIONS" && (webhookCode === "SYNC_UPDATES_AVAILABLE" || webhookCode === "DEFAULT_UPDATE")) {
      const db = getFirestoreDb()
      if (db) {
        // Record incoming automated transaction event
        await db.collection("plaidWebhooks").add({
          webhookType,
          webhookCode,
          itemId: body.item_id,
          newTransactions: body.new_transactions || 0,
          createdAt: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("POST /api/admin/plaid/webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
