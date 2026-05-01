/**
 * POST /api/comms/extract-events
 *
 * Reads a message body and extracts any scheduling information —
 * dates, times, locations, event types — and returns a structured
 * calendar event suggestion the user can confirm with one click.
 *
 * Also detects if the message is from a client and tags the segment
 * (rag / beam / personal) so it lands in the right Command Center bucket.
 *
 * Body:
 *   {
 *     messageId?: string       — optional: load from clientMessages collection
 *     body: string             — message text
 *     from: string             — sender
 *     subject?: string         — email subject if applicable
 *     channel: string          — gmail | outlook | whatsapp | imessage | sms
 *     clientId?: string        — if known
 *   }
 *
 * Returns:
 *   {
 *     hasEvent: boolean
 *     event?: {
 *       title: string
 *       start: string          — ISO date string
 *       end: string            — ISO date string
 *       location: string | null
 *       description: string
 *       segment: "rag" | "beam" | "personal"
 *       confidence: "high" | "medium" | "low"
 *       rawExtracted: string   — what Claude found verbatim in the message
 *     }
 *   }
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = getAdminDb()

    let messageBody = body.body ?? ""
    let from = body.from ?? ""
    let subject = body.subject ?? ""
    let channel = body.channel ?? "unknown"
    let clientId = body.clientId ?? null

    // If messageId provided, load from Firestore
    if (body.messageId && !messageBody) {
      const msgDoc = await db.collection("clientMessages").doc(body.messageId).get()
      if (msgDoc.exists) {
        const data = msgDoc.data()!
        messageBody = data.body ?? ""
        from = data.from ?? ""
        channel = data.channel ?? channel
        clientId = data.clientId ?? clientId
        subject = data.subject ?? ""
      }
    }

    if (!messageBody) {
      return NextResponse.json({ hasEvent: false })
    }

    const today = new Date().toISOString().split("T")[0]

    // Ask Claude to extract scheduling info
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: `You are a scheduling assistant for Ezra, founder of ReadyAimGo (a web/app agency) and a professional pianist and violist.

Today's date: ${today}

Extract scheduling information from messages. Classify the segment:
- "rag": client meetings, business calls, project reviews, anything work/agency-related
- "beam": BEAM Institute programs, cohort events, nonprofit-related
- "personal": piano, viola, rehearsals, performances, recitals, concerts, personal appointments, music lessons, UWM classes

Respond ONLY with valid JSON. No markdown, no explanation.

If the message contains NO scheduling information (no dates, times, or event-like language), respond with:
{"hasEvent": false}

If it DOES contain scheduling info:
{
  "hasEvent": true,
  "event": {
    "title": "short descriptive title",
    "start": "ISO 8601 datetime string (use noon if time not specified)",
    "end": "ISO 8601 datetime string (1 hour after start if duration not specified)",
    "location": "location string or null",
    "description": "1-2 sentence summary of what this event is",
    "segment": "rag|beam|personal",
    "confidence": "high|medium|low",
    "rawExtracted": "the exact date/time text found in the message"
  }
}`,
        messages: [
          {
            role: "user",
            content: `From: ${from}
Channel: ${channel}
Subject: ${subject}
Message: ${messageBody}`,
          },
        ],
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text ?? '{"hasEvent":false}'

    let result: any
    try {
      result = JSON.parse(text)
    } catch {
      result = { hasEvent: false }
    }

    // If an event was extracted and we have a clientId, save as suggestion to Firestore
    if (result.hasEvent && result.event && clientId) {
      await db.collection("eventSuggestions").add({
        clientId,
        messageFrom: from,
        channel,
        subject,
        extractedEvent: result.event,
        status: "pending", // "pending" | "confirmed" | "dismissed"
        createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[extract-events]", err)
    return NextResponse.json({ hasEvent: false, error: "Extraction failed" })
  }
}

// Confirm a suggested event — writes to calendarEvents collection
export async function PUT(req: NextRequest) {
  try {
    const { suggestionId, event } = await req.json()
    const db = getAdminDb()

    // Write confirmed event to calendarEvents
    await db.collection("calendarEvents").add({
      source: "extracted",
      segment: event.segment,
      title: event.title,
      start: event.start,
      end: event.end,
      location: event.location ?? null,
      description: event.description ?? null,
      attendees: [],
      meetLink: null,
      eventUrl: null,
      confirmedFromSuggestion: suggestionId ?? null,
      syncedAt: new Date().toISOString(),
    })

    // Mark suggestion as confirmed
    if (suggestionId) {
      await db.collection("eventSuggestions").doc(suggestionId).update({
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[extract-events PUT]", err)
    return NextResponse.json({ error: "Failed to confirm event" }, { status: 500 })
  }
}
