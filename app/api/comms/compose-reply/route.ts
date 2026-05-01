/**
 * POST /api/comms/compose-reply
 *
 * Drafts a reply to any message (email, WhatsApp, iMessage, Outlook)
 * in Ezra's voice — professional but direct, warm but efficient.
 *
 * The draft is returned for review. Nothing is sent automatically.
 * Sending happens via the appropriate channel API (Gmail send, WhatsApp reply, etc.)
 *
 * Body:
 *   {
 *     messageId?: string       — load message from Firestore
 *     originalBody: string     — the message being replied to
 *     from: string             — who sent it
 *     subject?: string         — email subject
 *     channel: string          — gmail | outlook | whatsapp | imessage
 *     clientId?: string
 *     clientName?: string
 *     intent?: string          — optional: "confirm" | "decline" | "schedule" | "pay" | "follow-up"
 *     additionalContext?: string — anything extra Ezra wants included in the reply
 *   }
 *
 * Returns:
 *   {
 *     draft: string            — the composed reply text
 *     subject?: string         — suggested reply subject for email
 *     tone: string             — "professional" | "warm" | "brief"
 *     suggestedActions: string[] — follow-up actions Claude noticed
 *   }
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"

// Ezra's voice profile — used in every reply prompt
const VOICE_PROFILE = `
Ezra Hauga is the founder of ReadyAimGo, a web and app development agency based in Milwaukee.
He is also a professional pianist and violist. His communication style is:
- Direct and clear — no corporate fluff, no filler phrases
- Warm but efficient — genuinely cares, but respects everyone's time
- Confident — speaks from authority without being arrogant
- Solution-oriented — moves things forward, doesn't dwell on problems
- Occasionally informal in casual contexts, always professional in client contexts

Do NOT use:
- "I hope this email finds you well"
- "Please don't hesitate to reach out"
- "As per my previous email"
- Excessive exclamation marks
- "Absolutely!" or "Certainly!" as openers

DO use:
- First-person, active voice
- Short paragraphs
- Concrete next steps when relevant
- Ezra's name in sign-offs: "— Ezra" or "Ezra / ReadyAimGo"
`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getAdminDb()

    let originalBody = body.originalBody ?? ""
    let from = body.from ?? ""
    let subject = body.subject ?? ""
    let channel = body.channel ?? "email"
    let clientId = body.clientId ?? null
    let clientName = body.clientName ?? null
    const intent = body.intent ?? null
    const additionalContext = body.additionalContext ?? null

    // Load message from Firestore if messageId provided
    if (body.messageId && !originalBody) {
      const msgDoc = await db.collection("clientMessages").doc(body.messageId).get()
      if (msgDoc.exists) {
        const data = msgDoc.data()!
        originalBody = data.body ?? ""
        from = data.from ?? ""
        channel = data.channel ?? channel
        clientId = data.clientId ?? clientId
        subject = data.subject ?? ""
      }
    }

    // Load client name from Firestore if not provided
    if (clientId && !clientName) {
      const clientDoc = await db.collection("clients").doc(clientId).get()
      clientName = clientDoc.data()?.name ?? null
    }

    if (!originalBody) {
      return NextResponse.json({ error: "No message body to reply to" }, { status: 400 })
    }

    // Adjust tone guidance based on channel
    const channelGuidance: Record<string, string> = {
      gmail: "This is an email reply. Include a subject line. Keep it professional but human.",
      outlook: "This is an email reply. Include a subject line. Keep it professional but human.",
      whatsapp: "This is a WhatsApp message. Keep it conversational and brief — 1-3 short paragraphs max. No formal sign-off needed.",
      imessage: "This is an iMessage. Keep it brief, natural, and conversational. 1-2 sentences is fine if that's all it needs.",
      sms: "This is an SMS. Keep it very short and direct.",
    }

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system: `You are drafting replies for Ezra Hauga. Write in his voice.

${VOICE_PROFILE}

Today is ${today}.
${clientName ? `The person Ezra is replying to is: ${clientName}` : ""}
${from ? `Their contact: ${from}` : ""}
Channel: ${channel}
${channelGuidance[channel] ?? ""}
${intent ? `Ezra's intended reply direction: ${intent}` : ""}
${additionalContext ? `Additional context from Ezra: ${additionalContext}` : ""}

Respond ONLY with valid JSON. No markdown, no explanation:
{
  "draft": "the full reply text ready to send",
  "subject": "reply subject line (only for email, null for other channels)",
  "tone": "professional|warm|brief",
  "suggestedActions": ["any follow-up actions Claude noticed from the original message"]
}`,
        messages: [
          {
            role: "user",
            content: `Original message to reply to:
${subject ? `Subject: ${subject}\n` : ""}From: ${from}
---
${originalBody}`,
          },
        ],
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text ?? "{}"

    let result: any
    try {
      result = JSON.parse(text)
    } catch {
      // If JSON parse fails, return the raw text as the draft
      result = {
        draft: text,
        subject: null,
        tone: "professional",
        suggestedActions: [],
      }
    }

    // Save draft to Firestore for history
    if (clientId || body.messageId) {
      await db.collection("replyDrafts").add({
        messageId: body.messageId ?? null,
        clientId,
        channel,
        originalBody,
        draft: result.draft,
        intent,
        status: "drafted", // "drafted" | "sent" | "discarded"
        createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[compose-reply]", err)
    return NextResponse.json({ error: "Failed to compose reply" }, { status: 500 })
  }
}
