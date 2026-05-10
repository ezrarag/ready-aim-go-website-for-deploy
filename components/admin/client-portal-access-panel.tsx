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
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  Mail,
  ShieldCheck,
  ShieldOff,
  UserPlus,
} from "lucide-react"
import { AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

type AccessStatus = {
  hasAccess: boolean
  email: string | null
  active: boolean
  provisionedAt: string | null
}

type Props = {
  clientId: string
  clientName: string
}

export function ClientPortalAccessPanel({ clientId, clientName }: Props) {
  const { toast } = useToast()
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [showForm, setShowForm] = useState(false)

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
        if (data.email) setEmail(data.email)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchStatus() }, [clientId])

  const handleProvision = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Valid email required", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/portal-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), notes }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to provision")

      toast({ title: "Portal access granted", description: data.message })
      setShowForm(false)
      setNotes("")
      await fetchStatus()
    } catch (e) {
      toast({
        title: "Failed to grant access",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

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
      await fetchStatus()
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
                    href={`https://clients.readyaimgo.biz/portal/${clientId}`}
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
                  onClick={() => setShowForm(true)}
                >
                  Update email
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

            {/* Grant / re-grant button */}
            {(!status.hasAccess || !status.active || showForm) && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {status.hasAccess ? "Update client email" : "Client email address"}
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maia@hroshi.com"
                    className="h-8 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") void handleProvision() }}
                  />
                  <p className="text-xs text-muted-foreground">
                    This email will be used to log into clients.readyaimgo.biz and must match what they sign in with.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any context about this access grant..."
                    className="text-sm min-h-[60px]"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 text-white hover:bg-emerald-500"
                    onClick={handleProvision}
                    disabled={submitting || !email.trim()}
                  >
                    {submitting ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Provisioning...</>
                    ) : (
                      <><CheckCircle className="h-3.5 w-3.5 mr-1" />
                        {status.hasAccess ? "Update access" : `Grant portal access to ${clientName}`}
                      </>
                    )}
                  </Button>
                  {showForm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load access status.</p>
        )}
      </CardContent>
    </AdminPanel>
  )
}
