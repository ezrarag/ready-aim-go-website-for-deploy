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
import type { AdminHubClient, AdminHubPerson, AdminHubWorkspace } from "@/lib/admin/ops-hub"
import type { ExtractedContractMilestone } from "@/lib/types/contracts"
import { cn } from "@/lib/utils"

type ReviewContract = {
  id: string
  title: string
  status: string
  clientId: string | null
  workspaceId: string | null
  payerEntity: string
  payerContact: string
  contractorName: string
  totalFee: number
  currency: string
  paymentTermsDays: number | null
  deadlineDate: string | null
  milestones: ExtractedContractMilestone[]
}

export function ClientManageModal({
  open,
  onOpenChange,
  client,
  clients,
  people,
  workspaces,
  onSaved,
  onEditWorkspace,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: AdminHubClient | null
  clients: AdminHubClient[]
  people: AdminHubPerson[]
  workspaces: AdminHubWorkspace[]
  /** Called after any persisted change so the dashboard can refresh. */
  onSaved: () => void
  onEditWorkspace?: (workspaceId: string) => void
}) {
  const [name, setName] = useState("")
  const [workspaceId, setWorkspaceId] = useState("")
  const [products, setProducts] = useState<Set<AdminProductKey>>(new Set())
  const [assignedUids, setAssignedUids] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [busyUid, setBusyUid] = useState<string | null>(null)
  const [contractsLoading, setContractsLoading] = useState(false)
  const [reviewContracts, setReviewContracts] = useState<ReviewContract[]>([])
  const [confirmingContractId, setConfirmingContractId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // People we can assign are those who have signed in (have a uid).
  const assignablePeople = useMemo(
    () => people.filter((person): person is AdminHubPerson & { uid: string } => Boolean(person.uid)),
    [people]
  )

  useEffect(() => {
    if (!open || !client) return
    setName(client.name)
    setWorkspaceId(client.workspaceId || "")
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

  useEffect(() => {
    if (!open || !client) return

    const loadContracts = async () => {
      setContractsLoading(true)
      try {
        const response = await fetch("/api/contracts?status=extracted&limit=100", { cache: "no-store" })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.success !== true) {
          throw new Error(payload?.error || `Contracts load returned ${response.status}`)
        }

        const nextContracts = (Array.isArray(payload.data) ? (payload.data as Array<Record<string, unknown>>) : [])
          .filter((record) => !record?.clientId || record.clientId === client.id)
          .map((record) => ({
            id: typeof record.id === "string" ? record.id : "",
            title: typeof record.title === "string" && record.title.trim() ? record.title.trim() : "Extracted contract",
            status: typeof record.status === "string" ? record.status : "extracted",
            clientId: typeof record.clientId === "string" && record.clientId.trim() ? record.clientId.trim() : null,
            workspaceId: typeof record.workspaceId === "string" && record.workspaceId.trim() ? record.workspaceId.trim() : null,
            payerEntity: typeof record.payerEntity === "string" ? record.payerEntity : "",
            payerContact: typeof record.payerContact === "string" ? record.payerContact : "",
            contractorName: typeof record.contractorName === "string" ? record.contractorName : "",
            totalFee: typeof record.totalFee === "number" ? record.totalFee : 0,
            currency: typeof record.currency === "string" && record.currency.trim() ? record.currency.trim() : "usd",
            paymentTermsDays: typeof record.paymentTermsDays === "number" ? record.paymentTermsDays : null,
            deadlineDate: typeof record.deadlineDate === "string" && record.deadlineDate.trim() ? record.deadlineDate.trim() : null,
            milestones: Array.isArray(record.milestones)
              ? record.milestones.flatMap((milestone: unknown) => {
                  if (!milestone || typeof milestone !== "object" || Array.isArray(milestone)) return []
                  const nextMilestone = milestone as Record<string, unknown>
                  const label = typeof nextMilestone.label === "string" ? nextMilestone.label.trim() : ""
                  if (!label) return []
                  const triggerType = typeof nextMilestone.triggerType === "string" ? nextMilestone.triggerType : "manual"
                  return [{
                    label,
                    amount: typeof nextMilestone.amount === "number" ? nextMilestone.amount : 0,
                    triggerType:
                      triggerType === "signing" || triggerType === "delivery" || triggerType === "manual"
                        ? triggerType
                        : "manual",
                  }]
                })
              : [],
          })) as ReviewContract[]

        setReviewContracts(nextContracts)
      } catch (loadError) {
        setReviewContracts([])
        setError(loadError instanceof Error ? loadError.message : "Unable to load extracted contracts.")
      } finally {
        setContractsLoading(false)
      }
    }

    void loadContracts()
  }, [open, client])

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
        body: JSON.stringify({
          name: name.trim(),
          activeProducts: Array.from(products),
          workspaceId: workspaceId.trim() || null,
        }),
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

  function updateContract(contractId: string, updater: (contract: ReviewContract) => ReviewContract) {
    setReviewContracts((current) => current.map((contract) => (contract.id === contractId ? updater(contract) : contract)))
  }

  async function confirmContract(contract: ReviewContract) {
    setConfirmingContractId(contract.id)
    setError(null)
    try {
      const response = await fetch(`/api/contracts/${encodeURIComponent(contract.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          title: contract.title,
          clientId: contract.clientId || client?.id || null,
          workspaceId: contract.workspaceId || workspaceId || null,
          payerEntity: contract.payerEntity,
          payerContact: contract.payerContact,
          contractorName: contract.contractorName,
          totalFee: contract.totalFee,
          currency: contract.currency,
          paymentTermsDays: contract.paymentTermsDays,
          deadlineDate: contract.deadlineDate,
          milestones: contract.milestones,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Contract confirm returned ${response.status}`)
      }
      setReviewContracts((current) => current.filter((entry) => entry.id !== contract.id))
      onSaved()
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Unable to confirm contract.")
    } finally {
      setConfirmingContractId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage person / relationship</DialogTitle>
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

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Canonical workspace
                </label>
                <div className="flex gap-2">
                  {client.portalEmail ? (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a
                        href="https://clients.readyaimgo.biz/dashboard/client"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View client dashboard
                      </a>
                    </Button>
                  ) : null}
                  {workspaceId && onEditWorkspace ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditWorkspace(workspaceId)}
                    >
                      Edit workspace
                    </Button>
                  ) : null}
                </div>
              </div>
              <select
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No linked workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.id})
                    {workspace.clientId && workspace.clientId !== client.id
                      ? ` - linked to ${workspace.clientId}`
                      : ""}
                  </option>
                ))}
              </select>
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

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Extracted contracts pending review
              </label>
              {contractsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading extracted contracts...
                </div>
              ) : reviewContracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No extracted contracts are waiting on review for this person.</p>
              ) : (
                <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-xl border border-border p-3">
                  {reviewContracts.map((contract) => (
                    <div key={contract.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{contract.title}</p>
                        <Badge variant="outline">{contract.status}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Input
                          value={contract.title}
                          onChange={(event) => updateContract(contract.id, (current) => ({ ...current, title: event.target.value }))}
                          placeholder="Contract title"
                        />
                        <select
                          value={contract.clientId || client.id}
                          onChange={(event) =>
                            updateContract(contract.id, (current) => ({
                              ...current,
                              clientId: event.target.value || null,
                            }))
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Pick a person</option>
                          {clients.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name} ({entry.id})
                            </option>
                          ))}
                        </select>
                        <Input
                          value={contract.payerEntity}
                          onChange={(event) => updateContract(contract.id, (current) => ({ ...current, payerEntity: event.target.value }))}
                          placeholder="Payer entity"
                        />
                        <Input
                          value={contract.payerContact}
                          onChange={(event) => updateContract(contract.id, (current) => ({ ...current, payerContact: event.target.value }))}
                          placeholder="Payer contact"
                        />
                        <Input
                          value={contract.contractorName}
                          onChange={(event) => updateContract(contract.id, (current) => ({ ...current, contractorName: event.target.value }))}
                          placeholder="Contractor name"
                        />
                        <Input
                          value={String(contract.totalFee || "")}
                          onChange={(event) => updateContract(contract.id, (current) => ({ ...current, totalFee: Number(event.target.value || "0") }))}
                          placeholder="Total fee"
                          inputMode="decimal"
                        />
                        <Input
                          value={contract.currency}
                          onChange={(event) => updateContract(contract.id, (current) => ({ ...current, currency: event.target.value }))}
                          placeholder="usd"
                        />
                        <Input
                          value={contract.paymentTermsDays ?? ""}
                          onChange={(event) =>
                            updateContract(contract.id, (current) => ({
                              ...current,
                              paymentTermsDays: event.target.value ? Number(event.target.value) : null,
                            }))
                          }
                          placeholder="Payment terms in days"
                          inputMode="numeric"
                        />
                        <Input
                          value={contract.deadlineDate || ""}
                          onChange={(event) => updateContract(contract.id, (current) => ({ ...current, deadlineDate: event.target.value || null }))}
                          placeholder="2026-07-31"
                        />
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Milestones</p>
                        {contract.milestones.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No milestones extracted yet.</p>
                        ) : (
                          contract.milestones.map((milestone, index) => (
                            <div key={`${contract.id}-${index}`} className="grid gap-2 md:grid-cols-3">
                              <Input
                                value={milestone.label}
                                onChange={(event) =>
                                  updateContract(contract.id, (current) => ({
                                    ...current,
                                    milestones: current.milestones.map((entry, entryIndex) =>
                                      entryIndex === index ? { ...entry, label: event.target.value } : entry
                                    ),
                                  }))
                                }
                                placeholder="Milestone label"
                              />
                              <Input
                                value={String(milestone.amount || "")}
                                onChange={(event) =>
                                  updateContract(contract.id, (current) => ({
                                    ...current,
                                    milestones: current.milestones.map((entry, entryIndex) =>
                                      entryIndex === index ? { ...entry, amount: Number(event.target.value || "0") } : entry
                                    ),
                                  }))
                                }
                                placeholder="Amount"
                                inputMode="decimal"
                              />
                              <select
                                value={milestone.triggerType}
                                onChange={(event) =>
                                  updateContract(contract.id, (current) => ({
                                    ...current,
                                    milestones: current.milestones.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? {
                                            ...entry,
                                            triggerType:
                                              event.target.value === "signing" ||
                                              event.target.value === "delivery" ||
                                              event.target.value === "manual"
                                                ? event.target.value
                                                : "manual",
                                          }
                                        : entry
                                    ),
                                  }))
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="signing">signing</option>
                                <option value="delivery">delivery</option>
                                <option value="manual">manual</option>
                              </select>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => void confirmContract(contract)}
                          disabled={confirmingContractId === contract.id}
                        >
                          {confirmingContractId === contract.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Confirm and create draft invoices
                        </Button>
                      </div>
                    </div>
                  ))}
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
