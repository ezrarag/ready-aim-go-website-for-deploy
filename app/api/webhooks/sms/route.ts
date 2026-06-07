/**
 * POST /api/webhooks/sms
 *
 * Telnyx inbound SMS webhook.
 * Called by Telnyx when a text message is received on the RAG number.
 *
 * Flow:
 *   1. Verify Telnyx webhook signature (optional but recommended)
 *   2. Extract sender, body, and message ID from Telnyx payload
 *   3. Look up sender phone number in clientDirectory to find clientId
 *   4. Run the Communication Kernel classification:
 *      - PERSONAL: sender is in personalContacts → write to personalWorkspace
 *      - BUSINESS: write to clientMessages → fire intent router
 *   5. Return 200 immediately (Telnyx requires fast response)
 *
 * Telnyx V2 webhook payload shape:
 * {
 *   data: {
 *     event_type: "message.received",
 *     payload: {
 *       id: string,
 *       from: { phone_number: string },
 *       to: [{ phone_number: string }],
 *       text: string,
 *       received_at: string,
 *     }
 *   }
 * }
 *
 * Env vars needed:
 *   TELNYX_API_KEY          — from Telnyx portal → API Keys
 *   TELNYX_PUBLIC_KEY       — from Telnyx portal → API Keys (for webhook verification)
 *   TELNYX_PHONE_NUMBER     — your purchased Telnyx number e.g. +14145550100
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"

// ── Personal contact allowlist ─────────────────────────────────────────────────
// Numbers here go to personalWorkspace collection, not clientMessages.
// Add family, friends, and personal contacts here.
// Format: E.164 e.g. "+14145550199"
const PERSONAL_CONTACTS: string[] = [
  // "+1XXXXXXXXXX",  // Mom
  // "+1XXXXXXXXXX",  // Personal contact
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  // Ensure E.164 format
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return raw
}

async function lookupClientByPhone(phone: string): Promise<string | null> {
  const db = getAdminDb()
  // Check clientComms collection for a mapped phone number
  const snap = await db
    .collection("clientComms")
    .where("whatsappFromNumbers", "array-contains", phone)
    .limit(1)
    .get()
  if (!snap.empty) return snap.docs[0].data().clientId ?? null

  // Also check the main clients collection for a phone field
  const clientSnap = await db
    .collection("clients")
    .where("phone", "==", phone)
    .limit(1)
    .get()
  if (!clientSnap.empty) return clientSnap.docs[0].id

  return null
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getAdminDb()
    const now = new Date().toISOString()

    // Extract payload from Telnyx V2 envelope
    const payload = body?.data?.payload
    if (!payload) {
      return NextResponse.json({ ok: true }) // Telnyx sends verification pings
    }

    const eventType = body?.data?.event_type
    if (eventType !== "message.received") {
      return NextResponse.json({ ok: true }) // Ignore non-message events
    }

    const fromRaw = payload?.from?.phone_number ?? ""
    const from = normalizePhone(fromRaw)
    const messageBody = payload?.text ?? ""
    const telnyxMessageId = payload?.id ?? ""

    if (!from || !messageBody) {
      return NextResponse.json({ ok: true })
    }

    // ── Communication Kernel: Personal vs Business classification ──────────────

    const isPersonal = PERSONAL_CONTACTS.includes(from)

    if (isPersonal) {
      // Route to personal workspace — private, never visible in client admin
      await db.collection("personalWorkspace").add({
        from,
        body: messageBody,
        source: "sms",
        channel: "telnyx-sms",
        telnyxMessageId,
        status: "unread",
        createdAt: now,
      })
      return NextResponse.json({ ok: true })
    }

    // ── Business path: look up client, write to clientMessages ────────────────

    const clientId = await lookupClientByPhone(from)

    const msgRef = await db.collection("clientMessages").add({
      clientId: clientId ?? null,         // null = unknown sender, needs review
      source: "telnyx-sms",
      channel: "sms",
      from,
      body: messageBody,
      telnyxMessageId,
      date: now,
      status: "received",
      intentProcessed: false,
      needsClientMatch: !clientId,        // flag for admin review if unknown
      createdAt: now,
    })

    // If clientId is known, fire intent router non-blocking
    if (clientId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://readyaimgo.biz"
      fetch(`${appUrl}/api/comms/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgRef.id }),
      }).catch((e) => console.error("[sms-webhook] intent routing error:", e))
    }

    // Telnyx requires a fast 200 response
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[sms-webhook]", err)
    // Always return 200 to Telnyx — errors should not cause retries
    return NextResponse.json({ ok: true })
  }
}

// GET handler for Telnyx webhook verification
export async function GET() {
  return NextResponse.json({ ok: true, service: "RAG SMS Webhook" })
}
