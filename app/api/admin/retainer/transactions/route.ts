import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { serializeFirestoreDocument } from "@/lib/firestore-json"

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    let transactions: Record<string, unknown>[] = []

    if (clientId) {
      const snap = await db
        .collection("clients")
        .doc(clientId)
        .collection("retainerLedger")
        .orderBy("createdAt", "desc")
        .get()

      transactions = snap.docs.map((doc) => serializeFirestoreDocument(doc.id, doc.data() as Record<string, unknown>))
    } else {
      const snap = await db
        .collectionGroup("retainerLedger")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get()

      transactions = snap.docs.map((doc) => serializeFirestoreDocument(doc.id, doc.data() as Record<string, unknown>))
    }

    return NextResponse.json({ success: true, data: transactions })
  } catch (error) {
    console.error("GET /api/admin/retainer/transactions:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load transactions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const clientId = readString(body.clientId)
    if (!clientId) {
      return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 })
    }

    const type = readString(body.type) as "deposit" | "drawdown" | null
    if (!type || (type !== "deposit" && type !== "drawdown")) {
      return NextResponse.json({ success: false, error: "type must be 'deposit' or 'drawdown'" }, { status: 400 })
    }

    const amountCents = readNumber(body.amountCents)
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ success: false, error: "amountCents must be a positive number" }, { status: 400 })
    }

    const channel = readString(body.channel) || (type === "deposit" ? "cashapp" : "retainer_drawdown")
    const senderOrPurpose = readString(body.senderOrPurpose) || (type === "deposit" ? "External Deposit" : "Retainer Drawdown")
    const statementOfPurpose = readString(body.statementOfPurpose)
    const allocatedTo = readString(body.allocatedTo)
    const matchInvoiceId = readString(body.matchInvoiceId)

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

    let nextBalanceCents = currentBalanceCents
    if (type === "deposit") {
      nextBalanceCents += amountCents
    } else {
      nextBalanceCents = Math.max(0, currentBalanceCents - amountCents)
    }

    const ledgerRef = clientRef.collection("retainerLedger").doc()
    const nowIso = new Date().toISOString()

    const transactionData = {
      id: ledgerRef.id,
      clientId,
      type,
      amountCents,
      channel,
      senderOrPurpose,
      statementOfPurpose: statementOfPurpose || (type === "drawdown" ? senderOrPurpose : null),
      allocatedTo: allocatedTo || null,
      matchInvoiceId: matchInvoiceId || null,
      createdByName: "Ezra Haugabrooks (Admin)",
      createdAt: nowIso,
      balanceAfterCents: nextBalanceCents,
    }

    await ledgerRef.set(transactionData)

    // Update client retainer balance
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

    // If an invoice is matched, mark it paid
    if (matchInvoiceId) {
      const invRef = clientRef.collection("invoices").doc(matchInvoiceId)
      const invSnap = await invRef.get()
      if (invSnap.exists) {
        await invRef.set(
          {
            status: "paid",
            paidAt: nowIso,
            paymentChannel: channel,
            updatedAt: nowIso,
          },
          { merge: true }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: transactionData,
      nextBalanceCents,
    })
  } catch (error) {
    console.error("POST /api/admin/retainer/transactions:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to record transaction" },
      { status: 500 }
    )
  }
}
