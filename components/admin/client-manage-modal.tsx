"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ADMIN_PRODUCT_KEYS, ADMIN_PRODUCT_LABELS, type AdminProductKey } from "@/lib/admin/products"
import type { AdminHubClient, AdminHubPerson } from "@/lib/admin/ops-hub"
import { cn } from "@/lib/utils"

export function ClientManageModal({
  open,
  onOpenChange,
  client,
  people,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: AdminHubClient | null
  people: AdminHubPerson[]
  /** Called after any persisted change so the dashboard can refresh. */
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [products, setProducts] = useState<Set<AdminProductKey>>(new Set())
  const [assignedUids, setAssignedUids] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [busyUid, setBusyUid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // People we can assign are those who have signed in (have a uid).
  const assignablePeople = useMemo(
    () => people.filter((person): person is AdminHubPerson & { uid: string } => Boolean(person.uid)),
    [people]
  )

  useEffect(() => {
    if (!open || !client) return
    setName(client.name)
    setProducts(new Set(client.activeProducts))
    setAssignedUids(
      new Set(
        assignablePeople
          .filter((person) => person.clientIds.includes(client.id))
          .map((person) => person.uid)
      )
    )
    setError(null)
  }, [open, client, assignablePeople])

  function toggleProduct(key: AdminProductKey) {
    setProducts((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function saveDetails() {
    if (!client) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(client.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), activeProducts: Array.from(products) }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Save returned ${res.status}`)
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save client.")
    } finally {
      setSaving(false)
    }
  }

  async function togglePerson(uid: string, assign: boolean) {
    if (!client) return
    setBusyUid(uid)
    setError(null)
    // Optimistic.
    setAssignedUids((current) => {
      const next = new Set(current)
      if (assign) next.add(uid)
      else next.delete(uid)
      return next
    })
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(client.id)}/people`, {
        method: assign ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Request returned ${res.status}`)
      }
      onSaved()
    } catch (err) {
      // Revert on failure.
      setAssignedUids((current) => {
        const next = new Set(current)
        if (assign) next.delete(uid)
        else next.add(uid)
        return next
      })
      setError(err instanceof Error ? err.message : "Unable to update assignment.")
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage client</DialogTitle>
        </DialogHeader>

        {client ? (
          <div className="space-y-5">
            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Name
              </label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Products
              </label>
              <div className="flex flex-wrap gap-2">
                {ADMIN_PRODUCT_KEYS.map((key) => {
                  const active = products.has(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleProduct(key)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      {ADMIN_PRODUCT_LABELS[key]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                People (signed in)
              </label>
              {assignablePeople.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signed-in people to assign yet.</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                  {assignablePeople.map((person) => {
                    const assigned = assignedUids.has(person.uid)
                    return (
                      <div
                        key={person.uid}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{person.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {assigned ? (
                            <Badge variant="outline" className="text-[10px]">
                              Assigned
                            </Badge>
                          ) : null}
                          <Button
                            variant={assigned ? "outline" : "default"}
                            size="sm"
                            disabled={busyUid === person.uid}
                            onClick={() => void togglePerson(person.uid, !assigned)}
                          >
                            {busyUid === person.uid ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : assigned ? (
                              "Remove"
                            ) : (
                              "Assign"
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          <Button onClick={() => void saveDetails()} disabled={saving || !client}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
