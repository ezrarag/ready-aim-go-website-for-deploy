/**
 * POST /api/comms/sync
 *
 * Dex-style Gmail + Google Calendar aggregator for RAG admin.
 *
 * Pulls Gmail threads and Calendar events, matches them to clients
 * by email address or domain, and writes structured records into Firestore
 * under clientComms/{clientId}/emails and clientComms/{clientId}/events.
 *
 * Once synced, every email thread with maia@hroshi.com automatically
 * appears in the Hroshi client record in RAG admin — no manual logging.
 *
 * PREREQUISITES:
 *   1. npm install googleapis
 *   2. Google Cloud Console → OAuth consent screen → add scopes:
 *        https://www.googleapis.com/auth/gmail.readonly
 *        https://www.googleapis.com/auth/calendar.readonly
 *   3. Run the one-time OAuth flow (see /api/auth/google/callback below)
 *      to store a refresh token at Firestore path: ragConfig/googleOAuth
 *      fields: { clientId, clientSecret, refreshToken }
 *   4. Add env var: GOOGLE_REDIRECT_URI=https://readyaimgo.biz/api/auth/google/callback
 *
 * TRIGGER OPTIONS:
 *   - Manual: POST /api/comms/sync from admin dashboard "Sync" button
 *   - Automatic: add to vercel.json:
 *       { "crons": [{ "path": "/api/comms/sync", "schedule": "0 * * * *" }] }
 *
 * FIRESTORE OUTPUT:
 *   clientComms/{clientId}/emails/{threadId}
 *     subject, snippet, from, to, date, threadUrl, labels, syncedAt
 *
 *   clientComms/{clientId}/events/{eventId}
 *     title, start, end, attendees, meetLink, calendarEventUrl, status, syncedAt
 */

import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { getFirestoreDb } from "@/lib/firestore"

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getGoogleClient() {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error("Firebase Admin is not configured for Google OAuth reads.")
  }
  const configDoc = await db.doc("ragConfig/googleOAuth").get()
  const { refreshToken, clientId, clientSecret } = configDoc.data() ?? {}

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Google OAuth not configured. Complete the OAuth flow at /api/auth/google and store credentials at ragConfig/googleOAuth in Firestore."
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI ?? "https://readyaimgo.biz/api/auth/google/callback"
  )

  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

// ── Client domain map ─────────────────────────────────────────────────────────
// Builds email → clientId and domain → clientId lookups from Firestore clients

async function buildClientDomainMap(): Promise<Map<string, string>> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error("Firebase Admin is not configured for client lookup.")
  }
  const snap = await db.collection("clients").get()
  const map = new Map<string, string>()

  snap.docs.forEach((doc) => {
    const data = doc.data()
    const emails: string[] = Array.isArray(data.emails)
      ? data.emails
      : data.email
      ? [data.email]
      : []

    emails.forEach((email: string) => {
      const lower = email.toLowerCase()
      const domain = lower.split("@")[1]
      map.set(lower, doc.id)
      if (domain) map.set(domain, doc.id)
    })
  })

  return map
}

function matchClient(addresses: string[], map: Map<string, string>): string | null {
  for (const addr of addresses) {
    const lower = addr.toLowerCase()
    if (map.has(lower)) return map.get(lower)!
    const domain = lower.split("@")[1]
    if (domain && map.has(domain)) return map.get(domain)!
  }
  return null
}

// ── Main sync handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await getGoogleClient()
    const db = getFirestoreDb()
    if (!db) {
      throw new Error("Firebase Admin is not configured for comms sync writes.")
    }
    const clientMap = await buildClientDomainMap()

    let emailsMatched = 0
    let eventsMatched = 0

    // ── Gmail ─────────────────────────────────────────────────────────────────
    const gmail = google.gmail({ version: "v1", auth })

    const threadsRes = await gmail.users.threads.list({
      userId: "me",
      maxResults: 100,
      labelIds: ["INBOX"],
    })

    for (const thread of threadsRes.data.threads ?? []) {
      const detail = await gmail.users.threads.get({
        userId: "me",
        id: thread.id!,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      })

      const first = detail.data.messages?.[0]
      if (!first) continue

      const h = (name: string) =>
        first.payload?.headers?.find(
          (x) => x.name?.toLowerCase() === name.toLowerCase()
        )?.value ?? ""

      const from = h("From")
      const to = h("To")
      const subject = h("Subject")
      const date = h("Date")

      const allAddresses =
        `${from} ${to}`.match(/[\w.+\-]+@[\w\-]+\.[a-z.]+/gi) ?? []

      const clientId = matchClient(allAddresses, clientMap)
      if (!clientId) continue

      await db
        .collection("clientComms")
        .doc(clientId)
        .collection("emails")
        .doc(thread.id!)
        .set(
          {
            subject,
            snippet: first.snippet ?? "",
            from,
            to,
            date,
            threadUrl: `https://mail.google.com/mail/u/0/#inbox/${thread.id}`,
            labels: first.labelIds ?? [],
            syncedAt: new Date().toISOString(),
          },
          { merge: true }
        )

      emailsMatched++
    }

    // ── Calendar ──────────────────────────────────────────────────────────────
    const calendar = google.calendar({ version: "v3", auth })

    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      timeMax: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
    })

    for (const event of eventsRes.data.items ?? []) {
      const attendees = (event.attendees ?? [])
        .map((a) => a.email ?? "")
        .filter(Boolean)

      const clientId = matchClient(attendees, clientMap)
      if (!clientId) continue

      await db
        .collection("clientComms")
        .doc(clientId)
        .collection("events")
        .doc(event.id!)
        .set(
          {
            title: event.summary ?? "(No title)",
            start: event.start?.dateTime ?? event.start?.date ?? "",
            end: event.end?.dateTime ?? event.end?.date ?? "",
            attendees,
            meetLink: event.hangoutLink ?? null,
            calendarEventUrl: event.htmlLink ?? "",
            status: event.status ?? "confirmed",
            syncedAt: new Date().toISOString(),
          },
          { merge: true }
        )

      eventsMatched++
    }

    return NextResponse.json({
      ok: true,
      emailsMatched,
      eventsMatched,
      syncedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[comms/sync]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    )
  }
}
