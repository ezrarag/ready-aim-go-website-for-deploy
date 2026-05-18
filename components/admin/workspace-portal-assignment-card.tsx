"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, RefreshCw, UserPlus, Users } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"

type WorkspaceRole =
  | "collaborator"
  | "employee-of-client"
  | "beam-participant"
  | "developer"
  | "owner"

const WORKSPACE_ROLE_OPTIONS: Array<{ value: WorkspaceRole; label: string }> = [
  { value: "collaborator", label: "Collaborator" },
  { value: "employee-of-client", label: "Employee Of Client" },
  { value: "beam-participant", label: "BEAM Participant" },
  { value: "developer", label: "Developer" },
  { value: "owner", label: "Owner" },
]

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
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function WorkspacePortalAssignmentCard({ clientId, clientName }: Props) {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<WorkspaceRole>("collaborator")
  const [notes, setNotes] = useState("")
  const [members, setMembers] = useState<PortalMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadMembers = async () => {
    setLoadingMembers(true)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/portal-members`, {
        cache: "no-store",
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to load portal people")
      }
      setMembers(Array.isArray(payload.members) ? (payload.members as PortalMember[]) : [])
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to load portal people",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => {
    void loadMembers()
  }, [clientId])

  const handleAssign = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      toast({ title: "Valid email required", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/portal-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          role,
          notes,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to assign portal workspace")
      }

      toast({
        title: "Workspace assigned",
        description: payload.message || `${normalizedEmail} can access ${clientName}.`,
      })
      setEmail("")
      setRole("collaborator")
      setNotes("")
      await loadMembers()
    } catch (error) {
      console.error(error)
      toast({
        title: "Workspace assignment failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Assign Portal Workspace
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px] xl:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="workspace-portal-email">Email</Label>
              <Input
                id="workspace-portal-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="person@example.com"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleAssign()
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-portal-role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as WorkspaceRole)}>
                <SelectTrigger id="workspace-portal-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACE_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-portal-notes">Notes</Label>
            <Textarea
              id="workspace-portal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional context for this access grant."
              rows={3}
            />
          </div>

          <Button onClick={handleAssign} disabled={submitting || !email.trim()}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Assign Workspace
          </Button>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Assigned portal people</p>
                <p className="text-xs text-muted-foreground">
                  Existing users appear immediately; new emails appear after they sign in.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void loadMembers()} disabled={loadingMembers}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingMembers ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingMembers ? (
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
                    <p className="truncate text-sm font-medium">
                      {member.displayName || member.email || member.uid}
                    </p>
                    {member.email ? (
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{member.email}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">Source: {member.source}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{member.role}</Badge>
                    <Badge variant={member.status === "active" ? "default" : "secondary"}>
                      {member.status}
                    </Badge>
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
