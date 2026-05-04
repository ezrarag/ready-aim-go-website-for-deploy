/**
 * POST /api/comms/intent
 *
 * AI intent router for the RAG communications hub.
 *
 * Reads any message from clientMessages (WhatsApp, Gmail, Outlook, SMS)
 * and classifies it into one of four intents, then takes action:
 *
 *   "payment"   → create a Stripe payment link and queue it to send back
 *   "schedule"  → extract time/date, create a task for calendar follow-up
 *   "task"      → extract the request, write to tasks/{clientId}
 *   "feedback"  → write to feedback collection, tag for RAG team review
 *   "none"      → log only, no automated action
 *
 * Called by:
 *   - WhatsApp webhook (readyaimgo-communications-hub-app) on each new message
 *   - Gmail + Outlook sync after writing each new email to clientMessages
 *   - Can also be called manually: POST /api/comms/intent { messageId }
 *
 * Body:
 *   { messageId: string }   — ID of document in clientMessages collection
 *
 * Or inline:
 *   { clientId, source, body, from, channel }  — process without prior Firestore write
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import Stripe from "stripe"

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required to create payment links.")
  }

  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  })
}

// ── Intent classification via Claude API ─────────────────────────────────────

type Intent = "payment" | "schedule" | "task" | "feedback" | "none"

type IntentResult = {
  intent: Intent
  confidence: "high" | "medium" | "low"
  summary: string           // one-line plain English summary of what the person wants
  extractedAmount?: number  // for payment intents, the amount in dollars if mentioned
  extractedDate?: string    // for schedule intents, the date/time if mentioned
  taskTitle?: string        // for task intents, a short actionable title
}

async function classifyIntent(body: string, clientName: string): Promise<IntentResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: `You are a business communication classifier for ReadyAimGo, a web and app development agency.
Classify incoming client messages into one of these intents:
- payment: client wants to pay, asks about pricing, mentions an amount, or references an invoice
- schedule: client wants to meet, book a call, set a time, or reschedule
- task: client is requesting work, a change, a feature, or a deliverable
- feedback: client is sharing an opinion, review, complaint, or compliment
- none: general conversation, greetings, or unclear

Respond ONLY with valid JSON, no markdown, no explanation. Format:
{
  "intent": "payment|schedule|task|feedback|none",
  "confidence": "high|medium|low",
  "summary": "one sentence describing what the client wants",
  "extractedAmount": null or number in dollars,
  "extractedDate": null or ISO date string,
  "taskTitle": null or short actionable task title
}`,
      messages: [
        {
          role: "user",
          content: `Client name: ${clientName}\nMessage: ${body}`,
        },
      ],
    }),
  })

  const data = await res.json()
  const text = data.content?.[0]?.text ?? "{}"

  try {
    return JSON.parse(text) as IntentResult
  } catch {
    return {
      intent: "none",
      confidence: "low",
      summary: "Could not parse intent",
    }
  }
}

// ── Action handlers ───────────────────────────────────────────────────────────

async function handlePaymentIntent(
  clientId: string,
  clientName: string,
  amount: number | undefined,
  summary: string,
  db: FirebaseFirestore.Firestore
) {
  // Create an open-amount Stripe payment link if no amount specified,
  // or a fixed-amount link if one was extracted from the message
  let paymentLink: string

  if (amount && amount > 0) {
    const stripe = getStripeClient()

    // Create a Stripe Price and Payment Link for the specific amount
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: Math.round(amount * 100),
      product_data: {
        name: `Payment — ${clientName}`,
        metadata: { clientId, summary },
      },
    })

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { clientId, source: "comms-intent-router" },
    })

    paymentLink = link.url
  } else {
    // No amount mentioned — use a generic custom-amount link
    // This falls back to the value transparency payment page built earlier
    paymentLink = `https://clients.readyaimgo.biz/portal/${clientId}?tab=investment`
  }

  // Write pending action to Firestore for RAG team to review + send
  await db.collection("pendingActions").add({
    type: "payment_link",
    clientId,
    clientName,
    paymentLink,
    amount: amount ?? null,
    summary,
    status: "pending_send",     // RAG team reviews before sending, or auto-send
    createdAt: new Date().toISOString(),
  })

  return { paymentLink }
}

async function handleScheduleIntent(
  clientId: string,
  clientName: string,
  date: string | undefined,
  summary: string,
  db: FirebaseFirestore.Firestore
) {
  await db.collection("tasks").add({
    clientId,
    clientName,
    title: `📅 Schedule: ${summary}`,
    type: "schedule",
    requestedDate: date ?? null,
    status: "pending",
    source: "comms-intent-router",
    createdAt: new Date().toISOString(),
  })
}

async function handleTaskIntent(
  clientId: string,
  clientName: string,
  taskTitle: string | undefined,
  summary: string,
  db: FirebaseFirestore.Firestore
) {
  await db.collection("tasks").add({
    clientId,
    clientName,
    title: taskTitle ?? summary,
    type: "deliverable",
    status: "pending",
    source: "comms-intent-router",
    createdAt: new Date().toISOString(),
  })
}

async function handleFeedbackIntent(
  clientId: string,
  summary: string,
  body: string,
  db: FirebaseFirestore.Firestore
) {
  await db.collection("feedback").add({
    clientId,
    summary,
    body,
    source: "comms-intent-router",
    status: "unreviewed",
    createdAt: new Date().toISOString(),
  })
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getFirestoreDb()
    if (!db) {
      throw new Error("Firebase Admin is not configured for intent routing.")
    }

    let messageData: {
      clientId: string
      source: string
      body: string
      from: string
      channel: string
    }

    // Support both inline data and messageId lookup
    if (body.messageId) {
      const msgDoc = await db.collection("clientMessages").doc(body.messageId).get()
      if (!msgDoc.exists) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 })
      }
      messageData = msgDoc.data() as typeof messageData
    } else {
      messageData = body
    }

    const { clientId, body: messageBody, from } = messageData

    // Fetch client name from Firestore
    const clientDoc = await db.collection("clients").doc(clientId).get()
    const clientName = clientDoc.data()?.name ?? clientId

    // Classify intent
    const result = await classifyIntent(messageBody, clientName)

    // Route to action handler
    let actionResult: Record<string, unknown> = {}

    switch (result.intent) {
      case "payment":
        actionResult = await handlePaymentIntent(
          clientId,
          clientName,
          result.extractedAmount,
          result.summary,
          db
        )
        break
      case "schedule":
        await handleScheduleIntent(clientId, clientName, result.extractedDate, result.summary, db)
        break
      case "task":
        await handleTaskIntent(clientId, clientName, result.taskTitle, result.summary, db)
        break
      case "feedback":
        await handleFeedbackIntent(clientId, result.summary, messageBody, db)
        break
    }

    // Mark message as intent-processed
    if (body.messageId) {
      await db.collection("clientMessages").doc(body.messageId).update({
        intentProcessed: true,
        intentResult: result,
        intentProcessedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      ok: true,
      intent: result.intent,
      confidence: result.confidence,
      summary: result.summary,
      action: actionResult,
    })
  } catch (err) {
    console.error("[comms/intent]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Intent routing failed" },
      { status: 500 }
    )
  }
}
