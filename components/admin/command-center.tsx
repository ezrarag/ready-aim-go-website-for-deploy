"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  MessageSquare,
  Music,
  RefreshCw,
  Terminal,
  Users,
  Waves,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"

// ── Types ─────────────────────────────────────────────────────────────────────

type Segment = "rag" | "beam" | "personal"

type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  segment: Segment
  source: string
  calendarName: string
  meetLink?: string
  location?: string
  attendees: string[]
}

type Task = {
  id: string
  title: string
  type: string
  status: string
  clientId?: string
  clientName?: string
  segment?: Segment
  createdAt: string
}

type Message = {
  id: string
  clientId: string
  source: string
  channel: string
  from: string
  body: string
  date: string
}

type PendingPayment = {
  id: string
  clientId: string
  clientName: string
  paymentLink: string
  amount: number | null
  summary: string
}

type BuildIssue = {
  projectId: string
  name: string
  pendingEnvVars: number
  blockedTasks: number
}

type CommandData = {
  summary: {
    totalUnreadMessages: number
    totalOpenTasks: number
    totalTodayEvents: number
    totalConflicts: number
    totalPendingPayments: number
    totalEnvVarsPending: number
  }
  segments: {
    rag: { tasks: Task[]; events: CalendarEvent[] }
    beam: { tasks: Task[]; events: CalendarEvent[] }
    personal: { tasks: Task[]; events: CalendarEvent[] }
  }
  today: { events: CalendarEvent[]; conflicts: Array<{ event1: CalendarEvent; event2: CalendarEvent }> }
  upcoming: CalendarEvent[]
  messages: Message[]
  pendingPayments: PendingPayment[]
  buildTracker: BuildIssue[]
  fetchedAt: string
}

// ── Segment config ────────────────────────────────────────────────────────────

const SEGMENT_CONFIG = {
  rag: {
    label: "ReadyAimGo",
    icon: <Terminal className="h-4 w-4" />,
    color: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    dot: "bg-orange-400",
  },
  beam: {
    label: "BEAM",
    icon: <Waves className="h-4 w-4" />,
    color: "border-teal-500/30 bg-teal-500/10 text-teal-400",
    dot: "bg-teal-400",
  },
  personal: {
    label: "Personal",
    icon: <Music className="h-4 w-4" />,
    color: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    dot: "bg-purple-400",
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SegmentBadge({ segment }: { segment: Segment }) {
  const cfg = SEGMENT_CONFIG[segment]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function EventCard({ event }: { event: CalendarEvent }) {
  const start = new Date(event.start)
  const isToday = start.toDateString() === new Date().toDateString()
  const timeStr = event.start.includes("T00:00:00")
    ? "All day"
    : start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const dateStr = isToday ? "Today" : start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5">
      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${SEGMENT_CONFIG[event.segment]?.dot ?? "bg-slate-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{dateStr} · {timeStr}</span>
          {event.source !== "google" && (
            <span className="text-xs text-muted-foreground">{event.calendarName}</span>
          )}
          {event.attendees.length > 1 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" />
              {event.attendees.length}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <SegmentBadge segment={event.segment} />
        {event.meetLink && (
          <a href={event.meetLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs">Join</Button>
          </a>
        )}
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  const segment = (task.segment ?? "rag") as Segment
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2">
      <div className={`h-2 w-2 shrink-0 rounded-full ${SEGMENT_CONFIG[segment]?.dot ?? "bg-slate-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{task.title}</p>
        {task.clientName && (
          <p className="text-xs text-muted-foreground">{task.clientName}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <SegmentBadge segment={segment} />
        <Badge className={
          task.status === "blocked"
            ? "border border-red-500/30 bg-red-500/10 text-red-400"
            : task.status === "in-progress"
            ? "border border-blue-500/30 bg-blue-500/10 text-blue-400"
            : "border border-slate-500/30 bg-slate-500/10 text-slate-400"
        }>
          {task.status}
        </Badge>
      </div>
    </div>
  )
}

function MessageRow({ message }: { message: Message }) {
  const SOURCE_ICONS: Record<string, string> = {
    gmail: "📧", outlook: "📨", whatsapp: "💬", imessage: "💙", sms: "📱"
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5">
      <span className="text-base shrink-0">{SOURCE_ICONS[message.source] ?? "💬"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{message.from} · {message.source}</p>
        <p className="text-sm text-foreground line-clamp-2 mt-0.5">{message.body}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {new Date(message.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommandCenter() {
  const [data, setData] = useState<CommandData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeSegment, setActiveSegment] = useState<Segment | "all">("all")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/command")
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const runCalendarSync = async () => {
    setSyncing(true)
    await fetch("/api/comms/calendar-sync", { method: "POST" })
    await fetchData()
    setSyncing(false)
  }

  useEffect(() => { void fetchData() }, [fetchData])

  const filteredEvents = data
    ? (activeSegment === "all"
        ? data.today.events
        : data.today.events.filter((e) => e.segment === activeSegment))
    : []

  const filteredTasks = data
    ? (activeSegment === "all"
        ? [
            ...data.segments.rag.tasks,
            ...data.segments.beam.tasks,
            ...data.segments.personal.tasks,
          ]
        : data.segments[activeSegment as Segment]?.tasks ?? [])
    : []

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_58%),radial-gradient(circle_at_80%_20%,_rgba(20,184,166,0.08),_transparent_34%)]" />

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
            <p className="text-sm text-muted-foreground">
              RAG · BEAM · Personal — all in one view.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-border/70 bg-card/80 text-xs"
            onClick={runCalendarSync}
            disabled={syncing}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync Calendars
          </Button>
          <Button
            variant="outline"
            className="border-border/70 bg-card/80 text-xs"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Segment filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "rag", "beam", "personal"] as const).map((seg) => (
          <button
            key={seg}
            onClick={() => setActiveSegment(seg)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeSegment === seg
                ? seg === "all"
                  ? "border-foreground/30 bg-foreground/10 text-foreground"
                  : SEGMENT_CONFIG[seg as Segment].color
                : "border-border/50 bg-card/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {seg === "all" ? "All" : (
              <>{SEGMENT_CONFIG[seg as Segment].icon} {SEGMENT_CONFIG[seg as Segment].label}</>
            )}
          </button>
        ))}
      </div>

      {/* Summary metrics */}
      {data && (
        <AdminPanel>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-6">
            <AdminMetricTile label="Unread Messages" value={data.summary.totalUnreadMessages} valueClassName={data.summary.totalUnreadMessages > 0 ? "text-orange-400" : undefined} />
            <AdminMetricTile label="Open Tasks" value={data.summary.totalOpenTasks} />
            <AdminMetricTile label="Today's Events" value={data.summary.totalTodayEvents} />
            <AdminMetricTile label="Conflicts" value={data.summary.totalConflicts} valueClassName={data.summary.totalConflicts > 0 ? "text-red-400" : undefined} />
            <AdminMetricTile label="Pending Payments" value={data.summary.totalPendingPayments} valueClassName={data.summary.totalPendingPayments > 0 ? "text-emerald-400" : undefined} />
            <AdminMetricTile label="Env Vars Missing" value={data.summary.totalEnvVarsPending} valueClassName={data.summary.totalEnvVarsPending > 0 ? "text-yellow-400" : undefined} />
          </CardContent>
        </AdminPanel>
      )}

      {loading && (
        <AdminPanel>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-orange-400" />
            <p className="text-sm text-muted-foreground">Loading command center...</p>
          </CardContent>
        </AdminPanel>
      )}

      {data && (
        <div className="grid gap-6 xl:grid-cols-2">

          {/* Today's schedule */}
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Today's Schedule
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.today.conflicts.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {data.today.conflicts.length} scheduling conflict{data.today.conflicts.length > 1 ? "s" : ""} detected today
                </div>
              )}
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => <EventCard key={event.id} event={event} />)
              ) : (
                <AdminPanelInset>
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {data.today.events.length === 0
                      ? "No events today. Sync calendars to pull in your schedule."
                      : "No events in this segment today."}
                  </p>
                </AdminPanelInset>
              )}
              <div className="pt-1">
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs text-muted-foreground" asChild>
                  <Link href="/dashboard/calendar">
                    Full calendar <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </AdminPanel>

          {/* Upcoming */}
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.upcoming.length > 0 ? (
                data.upcoming
                  .filter((e) => activeSegment === "all" || e.segment === activeSegment)
                  .slice(0, 6)
                  .map((event) => <EventCard key={event.id} event={event} />)
              ) : (
                <AdminPanelInset>
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming events in the next 7 days.</p>
                </AdminPanelInset>
              )}
            </CardContent>
          </AdminPanel>

          {/* Open tasks */}
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Open Tasks
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredTasks.length > 0 ? (
                filteredTasks.slice(0, 8).map((task) => <TaskRow key={task.id} task={task} />)
              ) : (
                <AdminPanelInset>
                  <p className="text-sm text-muted-foreground text-center py-4">No open tasks right now.</p>
                </AdminPanelInset>
              )}
              <div className="pt-1">
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs text-muted-foreground" asChild>
                  <Link href="/dashboard/admin/build-tracker">
                    Build Tracker <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </AdminPanel>

          {/* Unread messages */}
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Unread Messages
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.messages.length > 0 ? (
                data.messages.slice(0, 6).map((msg) => <MessageRow key={msg.id} message={msg} />)
              ) : (
                <AdminPanelInset>
                  <p className="text-sm text-muted-foreground text-center py-4">All caught up. No unread messages.</p>
                </AdminPanelInset>
              )}
              <div className="pt-1">
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs text-muted-foreground" asChild>
                  <Link href="/dashboard/comms">
                    All messages <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </AdminPanel>

          {/* Pending payments */}
          {data.pendingPayments.length > 0 && (
            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  Payments Ready to Send
                </AdminPanelTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.pendingPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{payment.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{payment.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {payment.amount && (
                        <span className="text-sm font-bold text-emerald-400">${payment.amount}</span>
                      )}
                      <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 text-white hover:bg-emerald-500" asChild>
                        <a href={payment.paymentLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Send
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </AdminPanel>
          )}

          {/* Build issues */}
          {data.buildTracker.length > 0 && (
            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-yellow-400" />
                  Build Issues
                </AdminPanelTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.buildTracker.map((project) => (
                  <AdminPanelInset key={project.projectId}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{project.name}</p>
                      <div className="flex items-center gap-2">
                        {project.pendingEnvVars > 0 && (
                          <Badge className="border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs">
                            {project.pendingEnvVars} env vars
                          </Badge>
                        )}
                        {project.blockedTasks > 0 && (
                          <Badge className="border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
                            {project.blockedTasks} blocked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AdminPanelInset>
                ))}
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs text-muted-foreground" asChild>
                  <Link href="/dashboard/admin/build-tracker">
                    Open Build Tracker <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </AdminPanel>
          )}

        </div>
      )}

      {data && (
        <p className="text-xs text-muted-foreground text-right">
          Last fetched {new Date(data.fetchedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
