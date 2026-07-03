"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarClock, CircleDot } from "lucide-react"

import { AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

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

type BriefingPayload = {
  window: BriefingWindow
  greeting: string
  events: BriefingEvent[]
  openLoops: OpenLoopItem[]
}

const WINDOW_LABELS: Record<BriefingWindow, string> = {
  money: "Money",
  build: "Build",
  practice: "Practice",
}

const WINDOW_BADGE_CLASSNAMES: Record<BriefingWindow, string> = {
  money: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  build: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  practice: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
}

const LOOP_LABELS: Record<OpenLoopItem["kind"], string> = {
  "build-task": "Build task",
  "client-idea": "Client idea",
  "client-feature": "Client feature",
}

function formatEventTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  })
}

export function DailyBriefingCard() {
  const [data, setData] = useState<BriefingPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/briefing", { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to load briefing.")
        }

        if (active) {
          setData(payload as BriefingPayload)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load briefing.")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const nextEvent = useMemo(() => {
    if (!data?.events.length) return null
    const now = Date.now()
    return data.events.find((event) => {
      const start = new Date(event.start).getTime()
      return Number.isFinite(start) && start >= now
    }) ?? data.events[0]
  }, [data])

  return (
    <AdminPanel>
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Daily Briefing
          </p>
          <AdminPanelTitle className="mt-2">Windowed command readout</AdminPanelTitle>
        </div>
        {data?.window ? (
          <Badge className={WINDOW_BADGE_CLASSNAMES[data.window]}>{WINDOW_LABELS[data.window]}</Badge>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {loading ? (
          <AdminPanelInset className="text-sm text-muted-foreground">Loading briefing...</AdminPanelInset>
        ) : null}

        {!loading && error ? (
          <AdminPanelInset className="flex items-start gap-3 border-red-500/30 bg-red-500/10 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </AdminPanelInset>
        ) : null}

        {!loading && !error && data ? (
          <>
            <AdminPanelInset className="space-y-3">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                <p className="text-sm leading-6 text-foreground">{data.greeting}</p>
              </div>
            </AdminPanelInset>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <AdminPanelInset className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Next event</p>
                  <Badge variant="outline">{data.events.length} today</Badge>
                </div>
                {nextEvent ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <CircleDot className="h-3.5 w-3.5" />
                      {formatEventTime(nextEvent.start)}
                      {nextEvent.segment ? ` · ${nextEvent.segment}` : ""}
                    </div>
                    <p className="text-sm font-medium text-foreground">{nextEvent.title}</p>
                    {nextEvent.location ? (
                      <p className="text-xs text-muted-foreground">{nextEvent.location}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No events scheduled for today.</p>
                )}
              </AdminPanelInset>

              <AdminPanelInset className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Open loops</p>
                  <Badge variant="outline">{data.openLoops.length}</Badge>
                </div>
                {data.openLoops.length > 0 ? (
                  <div className="space-y-3">
                    {data.openLoops.map((item) => (
                      <label key={`${item.kind}-${item.id}`} className="flex items-start gap-3">
                        <Checkbox checked={false} disabled className="mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">{item.title}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {LOOP_LABELS[item.kind]}
                            {item.parentId ? ` · ${item.parentId}` : ""}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No blocked or unprocessed loops right now.</p>
                )}
              </AdminPanelInset>
            </div>
          </>
        ) : null}
      </CardContent>
    </AdminPanel>
  )
}
