/**
 * POST /api/comms/calendar-sync
 *
 * Unified calendar sync — pulls from all calendar sources and writes
 * to a single Firestore calendarEvents collection with segment tagging.
 *
 * Sources:
 *   1. Google Calendar (RAG business calendar — already set up via /api/comms/sync)
 *   2. UWM Calendar (via ICS URL — free, no API needed)
 *   3. Personal/performance calendar (via ICS URL or Google Calendar API)
 *
 * Each event is tagged with a segment:
 *   "rag"      — client meetings, build calls, RAG business
 *   "beam"     — BEAM programs, cohort events, nonprofit
 *   "personal" — piano performances, viola rehearsals, personal appointments
 *
 * Segment is determined by:
 *   1. Calendar source (UWM = "personal" by default, overridable)
 *   2. Event title keywords (configurable below)
 *   3. Attendee domain (client domain → "rag", beamthinktank → "beam")
 *
 * SETUP:
 *   Add these env vars to Vercel:
 *     UWM_CALENDAR_ICS_URL   — from Outlook Web → Calendar → Share → Publish → ICS link
 *     PERSONAL_CALENDAR_ICS_URL — any personal iCal feed (optional)
 *
 * UWM ICS URL (get once, works forever):
 *   1. Go to outlook.office365.com → Calendar
 *   2. Click Share → Publish to web → toggle "Publish"  
 *   3. Format: ICS → copy the ICS URL
 *   4. Add to Vercel as UWM_CALENDAR_ICS_URL
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"
import { google } from "googleapis"

// ── Segment classification config ────────────────────────────────────────────

type Segment = "rag" | "beam" | "personal"

// Keywords in event titles that force a segment
const SEGMENT_KEYWORDS: Record<Segment, string[]> = {
  rag: ["client", "readyaimgo", "sprint", "deploy", "build", "handoff", "onboarding", "contract"],
  beam: ["beam", "cohort", "workforce", "participant", "nonprofit", "grant"],
  personal: ["piano", "viola", "rehearsal", "performance", "recital", "concert", "audition", "practice", "lesson"],
}

function classifySegment(title: string, attendees: string[], calendarSource: Segment): Segment {
  const lower = title.toLowerCase()

  // Check title keywords first
  for (const [segment, keywords] of Object.entries(SEGMENT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      return segment as Segment
    }
  }

  // Check attendee domains
  const hasClientDomain = attendees.some(
    (a) => !a.includes("readyaimgo") && !a.includes("beamthinktank") && !a.includes("uwm.edu") && a.includes("@")
  )
  if (hasClientDomain) return "rag"

  const hasBeamDomain = attendees.some((a) => a.includes("beamthinktank"))
  if (hasBeamDomain) return "beam"

  // Fall back to calendar source default
  return calendarSource
}

// ── ICS parser (minimal, no external deps) ────────────────────────────────────

type ICSEvent = {
  uid: string
  title: string
  start: string
  end: string
  description: string
  location: string
  attendees: string[]
}

function parseICS(icsText: string): ICSEvent[] {
  const events: ICSEvent[] = []
  const lines = icsText.replace(/\r\n /g, "").split(/\r?\n/)

  let current: Partial<ICSEvent> | null = null

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = { attendees: [] }
    } else if (line === "END:VEVENT" && current) {
      if (current.uid && current.start) {
        events.push(current as ICSEvent)
      }
      current = null
    } else if (current) {
      const colonIdx = line.indexOf(":")
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).split(";")[0]
      const val = line.slice(colonIdx + 1).trim()

      switch (key) {
        case "UID": current.uid = val; break
        case "SUMMARY": current.title = val; break
        case "DTSTART": current.start = parseICSDate(val); break
        case "DTEND": current.end = parseICSDate(val); break
        case "DESCRIPTION": current.description = val.replace(/\\n/g, "\n"); break
        case "LOCATION": current.location = val; break
        case "ATTENDEE": {
          const email = val.match(/mailto:(.+)/i)?.[1]
          if (email) current.attendees!.push(email)
          break
        }
      }
    }
  }

  return events
}

function parseICSDate(val: string): string {
  // Handle YYYYMMDDTHHMMSSZ and YYYYMMDD formats
  const clean = val.replace(/[TZ]/g, "").replace(";VALUE=DATE", "")
  if (clean.length === 8) {
    // All-day: YYYYMMDD
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00.000Z`
  }
  // Datetime: YYYYMMDDHHMMSS
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(8, 10)}:${clean.slice(10, 12)}:${clean.slice(12, 14)}.000Z`
}

// ── Google Calendar auth (reuse from Gmail sync) ──────────────────────────────

async function getGoogleAuth() {
  const db = getAdminDb()
  const configDoc = await db.doc("ragConfig/googleOAuth").get()
  const { clientId, clientSecret, refreshToken } = configDoc.data() ?? {}

  if (!refreshToken || !clientId || !clientSecret) return null

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

// ── Main sync handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const db = getAdminDb()
  const now = new Date()
  const futureCutoff = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 days ahead

  let googleEventsCount = 0
  let uwmEventsCount = 0
  let personalEventsCount = 0

  // ── 1. Google Calendar (RAG business + personal Google calendars) ──────────
  const auth = await getGoogleAuth()
  if (auth) {
    const calendar = google.calendar({ version: "v3", auth })

    // Fetch all calendars the user has
    const calListRes = await calendar.calendarList.list()
    const calList = calListRes.data.items ?? []

    for (const cal of calList) {
      // Determine segment based on calendar name
      const calName = cal.summary?.toLowerCase() ?? ""
      let calSegment: Segment = "rag"
      if (
        calName.includes("personal") ||
        calName.includes("piano") ||
        calName.includes("viola") ||
        calName.includes("music") ||
        calName === "ezra"
      ) {
        calSegment = "personal"
      } else if (calName.includes("beam")) {
        calSegment = "beam"
      }

      const eventsRes = await calendar.events.list({
        calendarId: cal.id!,
        timeMin: now.toISOString(),
        timeMax: futureCutoff.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      })

      for (const event of eventsRes.data.items ?? []) {
        const attendees = (event.attendees ?? []).map((a) => a.email ?? "").filter(Boolean)
        const segment = classifySegment(event.summary ?? "", attendees, calSegment)

        await db.collection("calendarEvents").doc(`google_${event.id}`).set(
          {
            source: "google",
            calendarName: cal.summary,
            segment,
            title: event.summary ?? "(No title)",
            start: event.start?.dateTime ?? event.start?.date ?? "",
            end: event.end?.dateTime ?? event.end?.date ?? "",
            attendees,
            meetLink: event.hangoutLink ?? null,
            location: event.location ?? null,
            description: event.description ?? null,
            eventUrl: event.htmlLink ?? null,
            syncedAt: now.toISOString(),
          },
          { merge: true }
        )
        googleEventsCount++
      }
    }
  }

  // ── 2. UWM Calendar via ICS ───────────────────────────────────────────────
  const uwmIcsUrl = process.env.UWM_CALENDAR_ICS_URL
  if (uwmIcsUrl) {
    const icsRes = await fetch(uwmIcsUrl)
    if (icsRes.ok) {
      const icsText = await icsRes.text()
      const events = parseICS(icsText)

      for (const event of events) {
        // Only sync future events
        if (event.start < now.toISOString()) continue
        if (event.start > futureCutoff.toISOString()) continue

        const segment = classifySegment(event.title, event.attendees, "personal")

        await db.collection("calendarEvents").doc(`uwm_${event.uid}`).set(
          {
            source: "uwm",
            calendarName: "UWM",
            segment,
            title: event.title,
            start: event.start,
            end: event.end,
            attendees: event.attendees,
            location: event.location ?? null,
            description: event.description ?? null,
            meetLink: null,
            eventUrl: null,
            syncedAt: now.toISOString(),
          },
          { merge: true }
        )
        uwmEventsCount++
      }
    }
  }

  // ── 3. Personal ICS (optional — any other iCal feed) ─────────────────────
  const personalIcsUrl = process.env.PERSONAL_CALENDAR_ICS_URL
  if (personalIcsUrl) {
    const icsRes = await fetch(personalIcsUrl)
    if (icsRes.ok) {
      const icsText = await icsRes.text()
      const events = parseICS(icsText)

      for (const event of events) {
        if (event.start < now.toISOString()) continue
        if (event.start > futureCutoff.toISOString()) continue

        const segment = classifySegment(event.title, event.attendees, "personal")

        await db.collection("calendarEvents").doc(`personal_${event.uid}`).set(
          {
            source: "personal",
            calendarName: "Personal",
            segment,
            title: event.title,
            start: event.start,
            end: event.end,
            attendees: event.attendees,
            location: event.location ?? null,
            description: event.description ?? null,
            meetLink: null,
            eventUrl: null,
            syncedAt: now.toISOString(),
          },
          { merge: true }
        )
        personalEventsCount++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    googleEventsCount,
    uwmEventsCount,
    personalEventsCount,
    syncedAt: now.toISOString(),
  })
}
