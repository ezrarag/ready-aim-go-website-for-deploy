"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Loader2, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { generateSlug, emailToDocId, type AllowlistEntry } from "@/lib/beam-access-shared"

type FormState = {
  email: string
  clientName: string
  clientSlug: string
  notes: string
}

const INITIAL_FORM: FormState = {
  email: "",
  clientName: "",
  clientSlug: "",
  notes: "",
}

export function BeamPortalAccessPanel() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<AllowlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null)
  const [slugEdited, setSlugEdited] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  const activeCount = entries.filter((entry) => entry.active).length
  const revokedCount = entries.length - activeCount

  const loadEntries = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const response = await fetch("/api/admin/beam-access", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to load BEAM portal access")
      }
      setEntries(Array.isArray(payload.entries) ? (payload.entries as AllowlistEntry[]) : [])
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to load BEAM access",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadEntries()
  }, [])

  useEffect(() => {
    if (!slugEdited) {
      setForm((current) => ({
        ...current,
        clientSlug: generateSlug(current.clientName),
      }))
    }
  }, [form.clientName, slugEdited])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch("/api/admin/beam-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to grant BEAM portal access")
      }

      setForm(INITIAL_FORM)
      setSlugEdited(false)
      await loadEntries("refresh")
      toast({
        title: "Access granted",
        description: `${payload.entry?.email ?? form.email} is now allowlisted for the BEAM portal.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Grant failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetActive = async (docId: string, active: boolean) => {
    setUpdatingDocId(docId)
    try {
      const response = await fetch(`/api/admin/beam-access/${encodeURIComponent(docId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to update access")
      }

      setEntries((current) =>
        current.map((entry) => (emailToDocId(entry.email) === docId ? (payload.entry as AllowlistEntry) : entry))
      )
      toast({
        title: active ? "Access restored" : "Access revoked",
        description: `${payload.entry?.email ?? docId} has been ${active ? "restored" : "revoked"}.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setUpdatingDocId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BEAM Portal Access</h1>
          <p className="text-muted-foreground">
            Grant or revoke access to the BEAM client portal from the ReadyAimGo admin dashboard.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadEntries("refresh")} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Access
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricTile label="Allowlist Entries" value={entries.length} />
        <AdminMetricTile label="Active Access" value={activeCount} />
        <AdminMetricTile label="Revoked Access" value={revokedCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle>Add Client Email</AdminPanelTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="beam-email">Email address</Label>
                  <Input
                    id="beam-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="user@client.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beam-client-name">Client / Org name</Label>
                  <Input
                    id="beam-client-name"
                    value={form.clientName}
                    onChange={(event) => setForm((current) => ({ ...current, clientName: event.target.value }))}
                    placeholder="PaynePros"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="beam-client-slug">Client slug</Label>
                <Input
                  id="beam-client-slug"
                  value={form.clientSlug}
                  onChange={(event) => {
                    setSlugEdited(true)
                    setForm((current) => ({ ...current, clientSlug: generateSlug(event.target.value) }))
                  }}
                  placeholder="paynepros"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="beam-notes">Notes (optional)</Label>
                <Textarea
                  id="beam-notes"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Client portal notes, owner context, or internal reminders."
                  rows={4}
                />
              </div>

              <AdminPanelInset className="space-y-1">
                <div className="text-sm font-medium text-foreground">Document preview</div>
                <div className="text-xs text-muted-foreground">
                  Firestore doc ID: {form.email ? emailToDocId(form.email) : "email_with_dots_replaced"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Saved slug: {form.clientSlug || "client-slug"}
                </div>
              </AdminPanelInset>

              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? "Granting Access..." : "Grant Access"}
              </Button>
            </form>
          </CardContent>
        </AdminPanel>

        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle>Current Access</AdminPanelTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading allowlist entries...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="admin-table-head hover:bg-transparent">
                      <TableHead className="font-semibold text-foreground">Email</TableHead>
                      <TableHead className="font-semibold text-foreground">Client</TableHead>
                      <TableHead className="font-semibold text-foreground">Slug</TableHead>
                      <TableHead className="font-semibold text-foreground">Added</TableHead>
                      <TableHead className="font-semibold text-foreground">Status</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="admin-table-empty py-10 text-center text-muted-foreground">
                          No BEAM portal allowlist entries yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry) => {
                        const docId = emailToDocId(entry.email)
                        const isUpdating = updatingDocId === docId

                        return (
                          <TableRow key={docId} className="admin-table-row">
                            <TableCell className="font-medium text-foreground">{entry.email}</TableCell>
                            <TableCell className="text-muted-foreground">
                              <div>{entry.clientName}</div>
                              {entry.notes ? <div className="mt-1 text-xs">{entry.notes}</div> : null}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{entry.clientSlug}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {entry.addedAt ? format(new Date(entry.addedAt), "MMM d, yyyy") : "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={entry.active ? "default" : "secondary"}
                                className={entry.active ? "bg-emerald-600 text-white hover:bg-emerald-600" : ""}
                              >
                                {entry.active ? (
                                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                ) : (
                                  <ShieldOff className="mr-1 h-3.5 w-3.5" />
                                )}
                                {entry.active ? "Active" : "Revoked"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant={entry.active ? "destructive" : "outline"}
                                size="sm"
                                disabled={isUpdating}
                                onClick={() => void handleSetActive(docId, !entry.active)}
                              >
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {entry.active ? "Revoke" : "Restore"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </AdminPanel>
      </div>
    </div>
  )
}
