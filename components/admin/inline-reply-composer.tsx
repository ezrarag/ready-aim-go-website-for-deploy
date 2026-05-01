"use client"

/**
 * InlineReplyComposer
 *
 * Dropped into any message view. Shows the original message,
 * lets Ezra pick an intent direction or add context, then generates
 * a Claude-drafted reply in his voice for review before sending.
 *
 * Usage:
 *   <InlineReplyComposer
 *     messageId="abc123"
 *     originalBody="Hey Ezra, can we meet Thursday at 2pm?"
 *     from="maia@hroshi.com"
 *     channel="gmail"
 *     subject="Re: Hroshi pilot"
 *     clientId="hroshi"
 *     clientName="Maia (Hroshi)"
 *   />
 */

import { useState } from "react"
import {
  Bot,
  Check,
  ChevronDown,
  ClipboardCopy,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type Intent = "auto" | "confirm" | "decline" | "schedule" | "pay" | "follow-up" | "more-info"

const INTENT_LABELS: Record<Intent, string> = {
  auto: "Let Claude decide",
  confirm: "Confirm / Agree",
  decline: "Decline / Not available",
  schedule: "Set up a time",
  pay: "Payment / Invoice",
  "follow-up": "Following up",
  "more-info": "Need more information",
}

type Props = {
  messageId?: string
  originalBody: string
  from: string
  channel: "gmail" | "outlook" | "whatsapp" | "imessage" | "sms"
  subject?: string
  clientId?: string
  clientName?: string
  onSend?: (draft: string) => void  // called if parent handles actual sending
}

const CHANNEL_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  whatsapp: "WhatsApp",
  imessage: "iMessage",
  sms: "SMS",
}

export function InlineReplyComposer({
  messageId,
  originalBody,
  from,
  channel,
  subject,
  clientId,
  clientName,
  onSend,
}: Props) {
  const [open, setOpen] = useState(false)
  const [intent, setIntent] = useState<Intent>("auto")
  const [additionalContext, setAdditionalContext] = useState("")
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState("")
  const [suggestedSubject, setSuggestedSubject] = useState("")
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    setDraft("")
    setSuggestedActions([])

    try {
      const res = await fetch("/api/comms/compose-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          originalBody,
          from,
          channel,
          subject,
          clientId,
          clientName,
          intent: intent === "auto" ? null : intent,
          additionalContext: additionalContext.trim() || null,
        }),
      })

      const data = await res.json()
      setDraft(data.draft ?? "")
      setSuggestedSubject(data.subject ?? "")
      setSuggestedActions(data.suggestedActions ?? [])
    } catch {
      toast.error("Failed to generate reply.")
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Reply copied to clipboard.")
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Bot className="h-3.5 w-3.5 text-purple-400" />
        Draft reply with Claude
      </Button>
    )
  }

  return (
    <div className="rounded-[20px] border border-purple-500/20 bg-purple-500/5 p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-foreground">Reply Composer</span>
          <Badge className="border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs">
            {CHANNEL_LABELS[channel] ?? channel}
          </Badge>
          {clientName && (
            <Badge variant="outline" className="text-xs">{clientName}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
          onClick={() => setOpen(false)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Original message preview */}
      <div className="rounded-xl border border-border/50 bg-card/60 p-3">
        <p className="text-xs text-muted-foreground mb-1">Replying to · {from}</p>
        <p className="text-sm text-foreground/80 line-clamp-4">{originalBody}</p>
      </div>

      {/* Controls */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Reply direction</Label>
          <Select value={intent} onValueChange={(v) => setIntent(v as Intent)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTENT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Additional context (optional)</Label>
          <Textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="e.g. I'm available Thursday after 3pm…"
            className="h-8 min-h-[32px] text-xs resize-none py-1.5"
            rows={1}
          />
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full bg-purple-600 text-white hover:bg-purple-500 text-xs h-8"
      >
        {generating ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Writing reply...</>
        ) : draft ? (
          <><RefreshCw className="h-3.5 w-3.5 mr-2" />Regenerate</>
        ) : (
          <><Bot className="h-3.5 w-3.5 mr-2" />Generate reply</>
        )}
      </Button>

      {/* Draft output */}
      {draft && (
        <div className="space-y-3">
          {suggestedSubject && (
            <div className="rounded-lg border border-border/50 bg-card/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="text-sm font-medium text-foreground">{suggestedSubject}</p>
            </div>
          )}

          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="text-sm min-h-[140px] bg-card/60 border-border/60"
            rows={6}
          />

          {/* Follow-up actions */}
          {suggestedActions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Suggested follow-ups:</p>
              {suggestedActions.map((action, i) => (
                <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-purple-400">→</span>
                  {action}
                </p>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={handleCopy}
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 mr-1" />Copied!</>
              ) : (
                <><ClipboardCopy className="h-3.5 w-3.5 mr-1" />Copy to clipboard</>
              )}
            </Button>
            {onSend && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => onSend(draft)}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Send via {CHANNEL_LABELS[channel]}
              </Button>
            )}
            <p className="text-xs text-muted-foreground ml-auto">
              Edit before sending — nothing is sent automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
