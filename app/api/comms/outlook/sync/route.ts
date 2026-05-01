/**
 * POST /api/comms/outlook/sync
 *
 * Microsoft Outlook + Calendar sync via Microsoft Graph API.
 * Mirrors the Gmail sync — pulls emails and calendar events,
 * matches them to RAG clients by email/domain, writes to Firestore.
 *
 * PREREQUISITES:
 *   1. Go to portal.azure.com → App registrations → New registration
 *      Name: "RAG Communications Hub"
 *      Supported account type: "Accounts in any organizational directory and personal Microsoft accounts"
 *      Redirect URI: https://readyaimgo.biz/api/auth/outlook/callback
 *
 *   2. Under API permissions, add Microsoft Graph delegated permissions:
 *        Mail.Read
 *        Calendars.Read
 *        offline_access  (required for refresh tokens)
 *
 *   3. Under Certificates & secrets → New client secret → copy value immediately
 *
 *   4. Run the one-time OAuth flow (visit /api/auth/outlook in browser)
 *      to store tokens at Firestore path: ragConfig/outlookOAuth
 *      fields: { clientId, clientSecret, tenantId, refreshToken }
 *
 *   5. Add env vars to Vercel:
 *        OUTLOOK_CLIENT_ID
 *        OUTLOOK_CLIENT_SECRET
 *        OUTLOOK_TENANT_ID   (use "common" for personal + work accounts)
 *        OUTLOOK_REDIRECT_URI=https://readyaimgo.biz/api/auth/outlook/callback
 *
 * TRIGGER:
 *   - Manual: POST /api/comms/outlook/sync from admin dashboard
 *   - Automatic: add to vercel.json crons alongside Gmail sync
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { FieldValue } from "firebase-admin/firestore"

const GRAPH_BASE = "https://graph.microsoft.com/v1.0"

// ── Token management ──────────────────────────────────────────────────────────

async function getOutlookAccessToken(): Promise<string> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error("Firebase Admin is not configured for Outlook OAuth reads.")
  }
  const configDoc = await db.doc("ragConfig/outlookOAuth").get()
  const { clientId, clientSecret, tenantId, refreshToken } = configDoc.data() ?? {}

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Outlook OAuth not configured. Complete the OAuth flow at /api/auth/outlook."
    )
  }

  const tenant = tenantId ?? process.env.OUTLOOK_TENANT_ID ?? "common"

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Mail.Read Calendars.Read offline_access",
      }),
    }
  )

  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    throw new Error(`Outlook token refresh failed: ${JSON.stringify(tokenData)}`)
  }

  // If a new refresh token was issued, store it
  if (tokenData.refresh_token && tokenData.refresh_token !== refreshToken) {
    await db.doc("ragConfig/outlookOAuth").set(
      { refreshToken: tokenData.refresh_token, updatedAt: new Date().toISOString() },
      { merge: true }
    )
  }

  return tokenData.access_token
}

// ── Client domain map (shared pattern with Gmail sync) ────────────────────────

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
      : data.email ? [data.email] : []

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

// ── Graph API helper ──────────────────────────────────────────────────────────

async function graphGet(path: string, token: string) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Graph API error ${res.status}: ${path}`)
  return res.json()
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const token = await getOutlookAccessToken()
    const db = getFirestoreDb()
    if (!db) {
      throw new Error("Firebase Admin is not configured for Outlook sync writes.")
    }
    const clientMap = await buildClientDomainMap()

    let emailsMatched = 0
    let eventsMatched = 0

    // ── Outlook Mail ──────────────────────────────────────────────────────────
    const mailData = await graphGet(
      "/me/messages?$top=100&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,webLink&$orderby=receivedDateTime desc",
      token
    )

    for (const msg of mailData.value ?? []) {
      const fromEmail = msg.from?.emailAddress?.address ?? ""
      const toEmails: string[] = (msg.toRecipients ?? []).map(
        (r: any) => r.emailAddress?.address ?? ""
      )
      const allAddresses = [fromEmail, ...toEmails].filter(Boolean)

      const clientId = matchClient(allAddresses, clientMap)
      if (!clientId) continue

      await db
        .collection("clientComms")
        .doc(clientId)
        .collection("emails")
        .doc(`outlook_${msg.id}`)
        .set(
          {
            source: "outlook",
            subject: msg.subject ?? "(No subject)",
            snippet: msg.bodyPreview ?? "",
            from: fromEmail,
            to: toEmails.join(", "),
            date: msg.receivedDateTime ?? "",
            threadUrl: msg.webLink ?? "",
            labels: [],
            syncedAt: new Date().toISOString(),
          },
          { merge: true }
        )

      // Also write to unified clientMessages for intent routing
      await db.collection("clientMessages").add({
        clientId,
        source: "outlook",
        channel: "email",
        from: fromEmail,
        subject: msg.subject ?? "",
        body: msg.bodyPreview ?? "",
        date: msg.receivedDateTime ?? "",
        threadUrl: msg.webLink ?? "",
        status: "received",
        intentProcessed: false,
        createdAt: new Date().toISOString(),
      })

      emailsMatched++
    }

    // ── Outlook Calendar ──────────────────────────────────────────────────────
    const now = new Date()
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const future60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()

    const calData = await graphGet(
      `/me/calendarView?startDateTime=${past30}&endDateTime=${future60}&$top=250&$select=id,subject,start,end,attendees,onlineMeetingUrl,webLink`,
      token
    )

    for (const event of calData.value ?? []) {
      const attendees: string[] = (event.attendees ?? []).map(
        (a: any) => a.emailAddress?.address ?? ""
      ).filter(Boolean)

      const clientId = matchClient(attendees, clientMap)
      if (!clientId) continue

      await db
        .collection("clientComms")
        .doc(clientId)
        .collection("events")
        .doc(`outlook_${event.id}`)
        .set(
          {
            source: "outlook",
            title: event.subject ?? "(No title)",
            start: event.start?.dateTime ?? "",
            end: event.end?.dateTime ?? "",
            attendees,
            meetLink: event.onlineMeetingUrl ?? null,
            calendarEventUrl: event.webLink ?? "",
            status: "confirmed",
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
    console.error("[comms/outlook/sync]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Outlook sync failed" },
      { status: 500 }
    )
  }
}
