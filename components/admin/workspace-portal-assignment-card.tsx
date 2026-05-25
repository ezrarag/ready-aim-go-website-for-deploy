"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, RefreshCw, Search, UserPlus, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type PortalRole = "owner" | "developer" | "collaborator" | "employee-of-client" | "beam-participant"

type PendingPortalSignup = {
  id: string
  source?: "pending-client-signup" | "portal-user"
  email: string
  displayName: string
  companyName: string
  uid: string
  role: string
  organizationType: string
  notes: string
  serviceInterests: string[]
  assignedClientIds?: string[]
}

type PortalMember = {
  uid: string
  email: string | null
  displayName: string | null
  role: string
  status: string
  source: string
}

type Props = {
  clientId: string
  clientName: string
  onPendingCountChange?: (count: number) => void
  onAssigned?: () => void
}

const DEFAULT_REPOSITORY_CHAIN = "ezrarag/mkeblack"

const roleOptions: Array<{ value: PortalRole; label: string }> = [
  { value: "collaborator", label: "Collaborator" },
  { value: "owner", label: "Owner" },
  { value: "developer", label: "ReadyAimGo Developer" },
  { value: "employee-of-client", label: "Employee of Client" },
  { value: "beam-participant", label: "BEAM Participant" },
]

function candidateText(candidate: PendingPortalSignup): string {
  return [
    candidate.email,
    candidate.displayName,
    candidate.companyName,
    candidate.organizationType,
    candidate.role,
    candidate.notes,
    ...candidate.serviceInterests,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function candidateLabel(candidate: PendingPortalSignup): string {
  return candidate.email || candidate.displayName || candidate.companyName || candidate.id
}

function candidateSourceLabel(candidate: PendingPortalSignup): string {
  return candidate.source === "portal-user" ? "Existing portal user" : "Pending signup"
}

function highlightMatch(value: string, query: string) {
  const text = value || "Unknown"
  const needle = query.trim()
  if (!needle) return text

  const index = text.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return text

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-amber-200 px-0.5 text-amber-950">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  )
}

export function WorkspacePortalAssignmentCard({
  clientId,
  clientName,
  onPendingCountChange,
  onAssigned,
}: Props) {
  const [pendingSignups, setPendingSignups] = useState<PendingPortalSignup[]>([])
  const [members, setMembers] = useState<PortalMember[]>([])
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [role, setRole] = useState<PortalRole>("collaborator")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState("")

  const selectedSignup = pendingSignups.find((candidate) => candidate.id === selectedId) ?? null
  const filteredSignups = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return pendingSignups
    return pendingSignups.filter((candidate) => candidateText(candidate).includes(normalized))
  }, [pendingSignups, query])

  async function fetchPendingSignups() {
    const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/pending-portal-signups?limit=100`, {
      cache: "no-store",
    })
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || "Unable to load pending portal registrations.")
    }

    const candidates = Array.isArray(payload.candidates) ? (payload.candidates as PendingPortalSignup[]) : []
    setPendingSignups(candidates)
    onPendingCountChange?.(candidates.length)
  }

  async function fetchMembers() {
    const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/portal-members`, {
      cache: "no-store",
    })
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || "Unable to load assigned portal people.")
    }
    setMembers(Array.isArray(payload.members) ? (payload.members as PortalMember[]) : [])
  }

  async function refresh() {
    setLoading(true)
    setMessage("")
    try {
      await Promise.all([fetchPendingSignups(), fetchMembers()])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to refresh portal assignments.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [clientId])

  async function assignWorkspace() {
    if (!selectedSignup) {
      setMessage("Select a pending portal registration first.")
      return
    }

    setAssigning(true)
    setMessage("")
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/pending-portal-signups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingClientId: selectedSignup.source === "portal-user" ? undefined : selectedSignup.id,
          uid: selectedSignup.uid || (selectedSignup.source === "portal-user" ? selectedSignup.id : undefined),
          role,
          notes,
          repositoryChains: [DEFAULT_REPOSITORY_CHAIN],
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to assign workspace.")
      }

      setMessage(`${candidateLabel(selectedSignup)} is now assigned to ${clientName}.`)
      setSelectedId("")
      setQuery("")
      setNotes("")
      await refresh()
      onAssigned?.()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign workspace.")
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Card id="assign-portal-workspace">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Assign Portal Workspace
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Approve new Google signups or add an existing portal user to this workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingSignups.length > 0 ? (
              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                {pendingSignups.length} unassigned
              </Badge>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading || assigning}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portal-signup-typeahead">Pending portal registration</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="portal-signup-typeahead"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Rick, Solana, email, company, notes..."
                autoComplete="off"
                className="pl-9"
              />
            </div>
          </div>

          <div
            role="listbox"
            aria-label="Pending portal registrations"
            className="max-h-72 overflow-auto rounded-lg border bg-background"
          >
            {filteredSignups.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                role="option"
                aria-selected={candidate.id === selectedId}
                onClick={() => {
                  setSelectedId(candidate.id)
                  setQuery(candidateLabel(candidate))
                }}
                className={`flex w-full flex-col items-start gap-1 border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted ${
                  candidate.id === selectedId ? "bg-amber-50 dark:bg-amber-950/20" : ""
                }`}
              >
                <span className="text-sm font-medium">{highlightMatch(candidateLabel(candidate), query)}</span>
                <span className="text-xs text-muted-foreground">
                  {highlightMatch(candidate.displayName || candidate.companyName || candidate.uid, query)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {candidateSourceLabel(candidate)}
                  {candidate.assignedClientIds?.length ? ` - already on ${candidate.assignedClientIds.length} workspace(s)` : ""}
                </span>
                {candidate.notes ? (
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {highlightMatch(candidate.notes, query)}
                  </span>
                ) : null}
              </button>
            ))}
            {!loading && filteredSignups.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No unassigned portal registrations are active.</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="portal-workspace-role">Workspace role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as PortalRole)}>
                <SelectTrigger id="portal-workspace-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-assignment-notes">Admin notes</Label>
              <Textarea
                id="portal-assignment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional note for this assignment."
                rows={3}
              />
            </div>
          </div>

          <Button type="button" onClick={assignWorkspace} disabled={!selectedSignup || assigning}>
            {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Assign Workspace
          </Button>

          {selectedSignup ? (
            <p className="text-xs text-muted-foreground">
              Pairing <span className="font-medium text-foreground">{candidateLabel(selectedSignup)}</span> to{" "}
              <span className="font-medium text-foreground">{clientName}</span> with repository chain{" "}
              <code className="rounded bg-muted px-1 py-0.5">{DEFAULT_REPOSITORY_CHAIN}</code>.
            </p>
          ) : null}

          {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Assigned portal people</p>
                <p className="text-xs text-muted-foreground">
                  Approved users appear here after the workspace transaction completes.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading portal people...
            </div>
          ) : members.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No signed-in portal users are associated with this workspace yet.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.uid}
                  className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.displayName || member.email || member.uid}</p>
                    {member.email ? (
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{member.email}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">Source: {member.source}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{member.role.replace(/-/g, " ")}</Badge>
                    <Badge variant={member.status === "active" ? "default" : "secondary"}>{member.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
