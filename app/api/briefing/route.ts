import { NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { serializeFirestoreDocument } from "@/lib/firestore-json"

type BriefingWindow = "money" | "build" | "practice"

type BriefingEvent = {
  id: string
  title: string
  start: string
  end: string | null
  segment: string | null
  source: string | null
  calendarName: string | null
  location: string | null
}

type OpenLoopItem = {
  id: string
  kind: "build-task" | "client-idea" | "client-feature"
  title: string
  status: string
  path: string
  parentId: string | null
}

type BriefingResponse = {
  window: BriefingWindow
  greeting: string
  events: BriefingEvent[]
  openLoops: OpenLoopItem[]
}

const CHICAGO_TZ = "America/Chicago"
const WINDOW_CUTOFFS = {
  money: 11 * 60 + 30,
  build: 17 * 60 + 30,
} as const

function getChicagoParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHICAGO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: Number(read("hour") || "0"),
    minute: Number(read("minute") || "0"),
  }
}

function getChicagoDateKey(date = new Date()) {
  const { year, month, day } = getChicagoParts(date)
  return `${year}-${month}-${day}`
}

function getBriefingWindow(date = new Date()): BriefingWindow {
  const { hour, minute } = getChicagoParts(date)
  const totalMinutes = hour * 60 + minute
  if (totalMinutes < WINDOW_CUTOFFS.money) return "money"
  if (totalMinutes <= WINDOW_CUTOFFS.build) return "build"
  return "practice"
}

function getChicagoDateForValue(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const { year, month, day } = getChicagoParts(date)
  return `${year}-${month}-${day}`
}

function readTextContent(payload: any): string {
  if (!payload || !Array.isArray(payload.content)) return ""
  return payload.content
    .filter((item: any) => item?.type === "text" && typeof item.text === "string")
    .map((item: any) => item.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim()
}

function fallbackGreeting(window: BriefingWindow, events: BriefingEvent[], openLoops: OpenLoopItem[]) {
  const nextEvent = events[0]
  const eventSentence = nextEvent
    ? `Your ${window} window starts with ${nextEvent.title} at ${new Date(nextEvent.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: CHICAGO_TZ })}.`
    : `Your ${window} window has no calendar events on the board right now.`
  const openLoopSentence =
    openLoops.length > 0
      ? `There are ${openLoops.length} open loops to close, led by ${openLoops.slice(0, 2).map((item) => item.title).join(" and ")}.`
      : "Open-loop check is clear right now."

  return `This is the ${window} window, so bias your attention toward the work that belongs in it. ${eventSentence} ${openLoopSentence}`
}

function toBriefingEvent(value: Record<string, unknown>) {
  const start = typeof value.start === "string" ? value.start : ""
  if (!start) return null

  return {
    id: typeof value.id === "string" ? value.id : "",
    title: typeof value.title === "string" ? value.title : "(No title)",
    start,
    end: typeof value.end === "string" ? value.end : null,
    segment: typeof value.segment === "string" ? value.segment : null,
    source: typeof value.source === "string" ? value.source : null,
    calendarName: typeof value.calendarName === "string" ? value.calendarName : null,
    location: typeof value.location === "string" ? value.location : null,
  } satisfies BriefingEvent
}

async function buildGreeting({
  window,
  events,
  openLoops,
}: BriefingResponse): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return fallbackGreeting(window, events, openLoops)
  }

  const eventSummary =
    events.length > 0
      ? events
          .slice(0, 5)
          .map((event) => {
            const time = new Date(event.start).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: CHICAGO_TZ,
            })
            return `${time} ${event.title}`
          })
          .join("; ")
      : "No events on today's calendar."

  const openLoopSummary =
    openLoops.length > 0
      ? openLoops
          .slice(0, 8)
          .map((item) => `${item.kind}: ${item.title}`)
          .join("; ")
      : "No blocked or unprocessed loops."

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 220,
      system:
        "You are preparing a tactical daily briefing for the ReadyAimGo admin dashboard. Write exactly 3 concise sentences, plain text only, with no bullets. Sentence 1 must name the current work window and what it implies. Sentence 2 must say what today's calendar dictates. Sentence 3 must report the open-loop check and what deserves attention first.",
      messages: [
        {
          role: "user",
          content: `Current window: ${window}\nToday's events: ${eventSummary}\nOpen loops: ${openLoopSummary}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    return fallbackGreeting(window, events, openLoops)
  }

  const payload = await response.json()
  return readTextContent(payload) || fallbackGreeting(window, events, openLoops)
}

export async function GET() {
  try {
    const db = getAdminDb()
    const now = new Date()
    const window = getBriefingWindow(now)
    const dateKey = getChicagoDateKey(now)
    const cacheId = `${dateKey}-${window}`
    const cacheRef = db.collection("briefings").doc(cacheId)
    const cached = await cacheRef.get()

    if (cached.exists) {
      const data = cached.data() as BriefingResponse | undefined
      if (data?.window && typeof data.greeting === "string" && Array.isArray(data.events) && Array.isArray(data.openLoops)) {
        return NextResponse.json(data)
      }
    }

    const broadStart = new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString()
    const broadEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString()

    const [eventsSnap, blockedBuildTasksSnap, unprocessedIdeasSnap, blockedFeaturesSnap] =
      await Promise.all([
        db.collection("calendarEvents")
          .where("start", ">=", broadStart)
          .where("start", "<=", broadEnd)
          .orderBy("start", "asc")
          .limit(100)
          .get(),
        db.collectionGroup("tasks")
          .where("status", "==", "blocked")
          .limit(100)
          .get(),
        db.collectionGroup("ideas")
          .where("status", "==", "unprocessed")
          .limit(100)
          .get(),
        db.collectionGroup("features")
          .where("status", "==", "blocked")
          .limit(100)
          .get(),
      ])

    const events = eventsSnap.docs
      .map((doc) => toBriefingEvent(serializeFirestoreDocument(doc.id, doc.data()) as Record<string, unknown>))
      .filter((event): event is BriefingEvent => Boolean(event))
      .filter((event) => getChicagoDateForValue(event.start) === dateKey)

    const buildTaskLoops: OpenLoopItem[] = blockedBuildTasksSnap.docs
      .filter((doc) => doc.ref.path.startsWith("buildProjects/"))
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          kind: "build-task",
          title: typeof data.title === "string" ? data.title : doc.id,
          status: typeof data.status === "string" ? data.status : "blocked",
          path: doc.ref.path,
          parentId: doc.ref.parent.parent?.id ?? null,
        }
      })

    const ideaLoops: OpenLoopItem[] = unprocessedIdeasSnap.docs
      .filter((doc) => doc.ref.path.startsWith("clients/"))
      .map((doc) => {
        const data = doc.data()
        const title =
          typeof data.title === "string"
            ? data.title
            : typeof data.text === "string"
              ? data.text.trim().slice(0, 120)
              : doc.id
        return {
          id: doc.id,
          kind: "client-idea",
          title,
          status: typeof data.status === "string" ? data.status : "unprocessed",
          path: doc.ref.path,
          parentId: doc.ref.parent.parent?.id ?? null,
        }
      })

    const featureLoops: OpenLoopItem[] = blockedFeaturesSnap.docs
      .filter((doc) => doc.ref.path.startsWith("clientProjects/"))
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          kind: "client-feature",
          title: typeof data.title === "string" ? data.title : doc.id,
          status: typeof data.status === "string" ? data.status : "blocked",
          path: doc.ref.path,
          parentId: doc.ref.parent.parent?.id ?? null,
        }
      })

    const openLoops = [...buildTaskLoops, ...ideaLoops, ...featureLoops]

    const payload: BriefingResponse = {
      window,
      greeting: "",
      events,
      openLoops,
    }

    payload.greeting = await buildGreeting(payload)

    await cacheRef.set({
      ...payload,
      cachedAt: now.toISOString(),
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("[briefing]", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load briefing.",
      },
      { status: 500 }
    )
  }
}
