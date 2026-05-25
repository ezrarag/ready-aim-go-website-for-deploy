"use client"

/**
 * ClientPortalAccessPanel
 *
 * Drop into the client detail page overview tab.
 * Shows current portal access status and lets admin:
 *   - Grant access (provisions ragAllowlist + projects in one click)
 *   - Update the email on an existing access record
 *   - Revoke access
 *
 * Usage:
 *   import { ClientPortalAccessPanel } from "@/components/admin/client-portal-access-panel"
 *   <ClientPortalAccessPanel clientId={clientId} clientName={client.name} />
 */

import { useEffect, useState } from "react"
import { ExternalLink, Loader2, Mail, ShieldCheck, ShieldOff, UserPlus, Users } from "lucide-react"
import { AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

type AccessStatus = {
  hasAccess: boolean
  email: string | null
  active: boolean
  provisionedAt: string | null
}

type PortalMember = {
  uid: string
  email: string | null
  displayName: string | null
  role: string
  status: string
  source: string
  approvedAt: string | null
  updatedAt: string | null
  lastLoginAt: string | null
}

type Props = {
  clientId: string
  clientName: string
}

export function ClientPortalAccessPanel({ clientId }: Props) {
  const { toast } = useToast()
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [members, setMembers] = useState<PortalMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/portal-access`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (data.success) {
        setStatus({
          hasAccess: data.hasAccess,
          email: data.email,
          active: data.active,
          provisionedAt: data.provisionedAt,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/portal-members`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (data.success) {
        setMembers(Array.isArray(data.members) ? (data.members as PortalMember[]) : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([fetchStatus(), fetchMembers()])
  }, [clientId])

  const handleRevoke = async () => {
    if (!status?.email) return
    if (!confirm(`Revoke portal access for ${status.email}? They will no longer be able to log into clients.readyaimgo.biz.`)) return

    setRevoking(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/portal-access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: status.email }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to revoke")
      toast({ title: "Access revoked", description: data.message })
      await Promise.all([fetchStatus(), fetchMembers()])
    } catch (e) {
      toast({
        title: "Failed to revoke",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setRevoking(false)
    }
  }

  return (
    <AdminPanel>
      <CardHeader>
        <AdminPanelTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Client Portal Access
        </AdminPanelTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking access status...
          </div>
        ) : status ? (
          <>
            {/* Current status */}
            <AdminPanelInset className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {status.hasAccess && status.active ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  ) : status.hasAccess && !status.active ? (
                    <ShieldOff className="h-4 w-4 text-red-400" />
                  ) : (
                    <ShieldOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {status.hasAccess && status.active
                      ? "Portal access active"
                      : status.hasAccess && !status.active
                      ? "Portal access revoked"
                      : "No portal access"}
                  </span>
                </div>
                <Badge
                  className={
                    status.hasAccess && status.active
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : status.hasAccess
                      ? "border border-red-500/30 bg-red-500/10 text-red-400"
                      : "border border-slate-500/30 bg-slate-500/10 text-slate-400"
                  }
                >
                  {status.hasAccess && status.active ? "Active" : status.hasAccess ? "Revoked" : "Not provisioned"}
                </Badge>
              </div>

              {status.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono text-xs">{status.email}</span>
                </div>
              )}

              {status.provisionedAt && (
                <p className="text-xs text-muted-foreground">
                  Provisioned {new Date(status.provisionedAt).toLocaleDateString([], {
                    year: "numeric", month: "short", day: "numeric"
                  })}
                </p>
              )}
            </AdminPanelInset>

            {/* Portal link if active */}
            {status.hasAccess && status.active && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <a
                    href={`https://clients.readyaimgo.biz/portal/${encodeURIComponent(clientId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    View their portal
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  asChild
                >
                  <a href="#assign-portal-workspace">Manage workspace people</a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-red-400 hover:text-red-300"
                  onClick={handleRevoke}
                  disabled={revoking}
                >
                  {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                  <span className="ml-1">Revoke</span>
                </Button>
              </div>
            )}

            <AdminPanelInset className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Known Portal People</div>
                    <div className="text-xs text-muted-foreground">
                      Users currently associated through users/{`{uid}`}.clientIds or the client members mirror.
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void fetchMembers()}>
                  Refresh
                </Button>
              </div>

              {membersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading associated people...
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No signed-in portal users are associated with this client yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.uid}
                      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {member.displayName || member.email || member.uid}
                          </span>
                          <Badge className="border border-slate-500/30 bg-slate-500/10 text-slate-300">
                            {member.role}
                          </Badge>
                          <Badge
                            className={
                              member.status === "active"
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                            }
                          >
                            {member.status}
                          </Badge>
                        </div>
                        {member.email ? (
                          <div className="mt-1 font-mono text-xs text-muted-foreground">{member.email}</div>
                        ) : null}
                        <div className="mt-1 text-xs text-muted-foreground">Source: {member.source}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanelInset>

            {(!status.hasAccess || !status.active) && (
              <AdminPanelInset className="space-y-2 border-amber-500/30 bg-amber-500/10">
                <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Workspace assignment is handled from the Workspace tab.
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the Assign Portal Workspace typeahead to approve pending portal registrations and bind them to
                  this client without manually typing an email address.
                </p>
              </AdminPanelInset>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load access status.</p>
        )}
      </CardContent>
    </AdminPanel>
  )
}
