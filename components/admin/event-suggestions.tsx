"use client"

/**
 * EventSuggestions
 *
 * Fetches pending event suggestions from Firestore (extracted from incoming
 * messages by /api/comms/extract-events) and lets Ezra confirm or dismiss
 * them with one click. Confirmed events land in calendarEvents and appear
 * in the Command Center schedule immediately.
 *
 * Drop anywhere in the Command Center or comms page:
 *   import { EventSuggestions } from "@/components/admin/event-suggestions"
 *   <EventSuggestions />
 */

import { useEffect, useState } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { CalendarCheck, CalendarX, Clock, Loader2, MapPin, Music, Terminal, Waves } from "lucide-react"
import { getDb } from "@/lib/firebase/config"
import { AdminPanel, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { toast } from "sonner"

type Segment = "rag" | "beam" | "personal"

type EventSuggestion = {
  id: string
  clientId: string
  messageFrom: string
  channel: string
  subject?: string
  status: "pending" | "confirmed" | "dismissed"
  extractedEvent: {
    title: string
    start: string
    end: string
    location: string | null
    description: string
    segment: Segment
    confidence: "high" | "medium" | "low"
    rawExtracted: string
  }
  createdAt: string
}

const SEGMENT_ICONS: Record<Segment, React.ReactNode> = {
  rag: <Terminal className="h-3 w-3" />,
  beam: <Waves className="h-3 w-3" />,
  personal: <Music className="h-3 w-3" />,
}

const SEGMENT_COLORS: Record<Segment, string> = {
  rag: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  beam: "border-teal-500/30 bg-teal-500/10 text-teal-400",
  personal: "border-purple-500/30 bg-purple-500/10 text-purple-400",
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-emerald-400",
  medium: "text-yellow-400",
  low: "text-slate-400",
}

const SOURCE_EMOJI: Record<string, string> = {
  gmail: "📧",
  outlook: "📨",
  whatsapp: "💬",
  imessage: "💙",
  sms: "📱",
}

export function EventSuggestions() {
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    const db = getDb()
    const q = query(
      collection(db, "eventSuggestions"),
      where("status", "==", "pending")
    )

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as EventSuggestion))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setSuggestions(items)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const handleConfirm = async (suggestion: EventSuggestion) => {
    setConfirming(suggestion.id)
    try {
      const res = await fetch("/api/comms/extract-events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          event: suggestion.extractedEvent,
        }),
      })
      if (res.ok) {
        toast.success(`"${suggestion.extractedEvent.title}" added to calendar.`)
      }
    } finally {
      setConfirming(null)
    }
  }

  const handleDismiss = async (suggestionId: string) => {
    // Optimistic remove
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
    await fetch("/api/comms/extract-events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId, dismissed: true }),
    })
  }

  if (loading || suggestions.length === 0) return null

  return (
    <AdminPanel>
      <CardHeader>
        <AdminPanelTitle className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-emerald-400" />
          Suggested Events from Messages
          <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 ml-1">
            {suggestions.length}
          </Badge>
        </AdminPanelTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const event = suggestion.extractedEvent
          const startDate = new Date(event.start)
          const isConfirming = confirming === suggestion.id

          return (
            <div
              key={suggestion.id}
              className="rounded-[20px] border border-border/60 bg-card/70 p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-base shrink-0 mt-0.5">
                    {SOURCE_EMOJI[suggestion.channel] ?? "💬"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From {suggestion.messageFrom}
                      {suggestion.subject ? ` · "${suggestion.subject}"` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-medium ${CONFIDENCE_COLORS[event.confidence]}`}>
                    {event.confidence} confidence
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${SEGMENT_COLORS[event.segment]}`}>
                    {SEGMENT_ICONS[event.segment]}
                    {event.segment}
                  </span>
                </div>
              </div>

              {/* Event details */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {startDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                  {" · "}
                  {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </span>
                )}
              </div>

              {/* What Claude extracted verbatim */}
              <p className="text-xs text-muted-foreground italic border-l-2 border-border/60 pl-2">
                "{event.rawExtracted}"
              </p>

              <p className="text-xs text-foreground/80">{event.description}</p>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 text-white hover:bg-emerald-500 text-xs"
                  onClick={() => handleConfirm(suggestion)}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <CalendarCheck className="h-3.5 w-3.5 mr-1" />
                  )}
                  Add to calendar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => handleDismiss(suggestion.id)}
                >
                  <CalendarX className="h-3.5 w-3.5 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </AdminPanel>
  )
}
