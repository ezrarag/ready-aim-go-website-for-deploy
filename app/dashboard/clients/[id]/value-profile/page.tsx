"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CircleDollarSign,
  CreditCard,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  Server,
  Trash2,
  UnlockKeyhole,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  computeValueProfileProgress,
  type ValueProfileResponse,
  type ValueThreshold,
} from "@/lib/value-profile"

type ThresholdDraft = {
  id: string
  label: string
  amount: string
  description: string
  deliverablesText: string
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatDate(value?: string) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function createDraftId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `threshold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function thresholdToDraft(threshold: ValueThreshold): ThresholdDraft {
  return {
    id: threshold.id,
    label: threshold.label,
    amount: String(threshold.amount),
    description: threshold.description ?? "",
    deliverablesText: threshold.deliverables.join("\n"),
  }
}

function draftToThreshold(draft: ThresholdDraft, index: number): ValueThreshold {
  const amount = Math.max(0, Number(draft.amount) || 0)
  const label = draft.label.trim() || `Threshold ${index + 1}`

  return {
    id: draft.id || createDraftId(),
    label,
    amount,
    description: draft.description.trim() || undefined,
    deliverables: draft.deliverablesText
      .split("\n")
      .map((deliverable) => deliverable.trim())
      .filter(Boolean),
  }
}

export default function AdminClientValueProfilePage() {
  const params = useParams()
  const clientId = params.id as string
  const [data, setData] = useState<ValueProfileResponse | null>(null)
  const [drafts, setDrafts] = useState<ThresholdDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const progress = useMemo(
    () => (data ? computeValueProfileProgress(data.profile) : null),
    [data]
  )

  const loadProfile = async (isRefresh = false) => {
    if (!clientId) return

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/value-profile`, {
        cache: "no-store",
      })
      const payload = (await response.json()) as ValueProfileResponse | { error?: string }

      if (!response.ok || !("success" in payload) || payload.success !== true) {
        throw new Error("error" in payload && payload.error ? payload.error : "Unable to load value profile.")
      }

      setData(payload)
      setDrafts(payload.profile.thresholds.map(thresholdToDraft))
    } catch (loadError) {
      console.error(loadError)
      setError(loadError instanceof Error ? loadError.message : "Unable to load value profile.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [clientId])

  const updateDraft = <Key extends keyof ThresholdDraft>(
    id: string,
    key: Key,
    value: ThresholdDraft[Key]
  ) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [key]: value } : draft))
    )
  }

  const handleAddThreshold = () => {
    setDrafts((current) => [
      ...current,
      {
        id: createDraftId(),
        label: `Threshold ${current.length + 1}`,
        amount: "",
        description: "",
        deliverablesText: "",
      },
    ])
  }

  const handleRemoveThreshold = (id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const thresholds = drafts.map(draftToThreshold)
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/value-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds }),
      })
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to save value profile.")
      }

      setMessage("Value thresholds saved.")
      await loadProfile(true)
    } catch (saveError) {
      console.error(saveError)
      setError(saveError instanceof Error ? saveError.message : "Unable to save value profile.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
          Loading value profile...
        </div>
      </DashboardLayout>
    )
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link href={`/dashboard/clients/${encodeURIComponent(clientId)}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to client
            </Link>
          </Button>
          <AdminPanelInset className="border-red-500/30 bg-red-500/10 text-sm text-red-700 dark:text-red-300">
            {error || "Unable to load value profile."}
          </AdminPanelInset>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" asChild className="w-fit">
              <Link href={`/dashboard/clients/${encodeURIComponent(data.client.id)}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to client
              </Link>
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-orange-500">
                Value Transparency
              </p>
              <h1 className="mt-2 text-2xl font-bold text-foreground">{data.client.name}</h1>
              <p className="text-sm text-muted-foreground">
                {data.client.storyId || data.client.id} · thresholds, payment tier, and attributed infrastructure.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void loadProfile(true)}
              disabled={refreshing || saving}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              className="bg-orange-600 text-white hover:bg-orange-500"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Thresholds"}
            </Button>
          </div>
        </div>

        {error ? (
          <AdminPanelInset className="border-red-500/30 bg-red-500/10 text-sm text-red-700 dark:text-red-300">
            {error}
          </AdminPanelInset>
        ) : null}
        {message ? (
          <AdminPanelInset className="border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </AdminPanelInset>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile
            label="Total Paid"
            value={formatCurrency(data.profile.totalPaid)}
            hint="Stripe-confirmed payment total"
            trailing={<CircleDollarSign className="h-8 w-8 text-orange-500" />}
          />
          <AdminMetricTile
            label="Monthly Infra"
            value={formatCurrency(data.infrastructureMonthlyTotal)}
            hint={`${data.infrastructureCosts.length} attributed service${data.infrastructureCosts.length === 1 ? "" : "s"}`}
            trailing={<Server className="h-8 w-8 text-cyan-400" />}
          />
          <AdminMetricTile
            label="Current Tier"
            value={progress?.currentThreshold?.label ?? "Baseline"}
            hint={progress?.currentThreshold ? formatCurrency(progress.currentThreshold.amount) : "No threshold crossed"}
            trailing={<UnlockKeyhole className="h-8 w-8 text-emerald-400" />}
          />
          <AdminMetricTile
            label="Next Unlock"
            value={progress?.nextThreshold ? formatCurrency(progress.amountToNext) : "Clear"}
            hint={progress?.nextThreshold?.label ?? "All configured thresholds crossed"}
            trailing={<LockKeyhole className="h-8 w-8 text-amber-400" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.86fr]">
          <AdminPanel>
            <CardHeader className="flex flex-col gap-3 border-b border-border/70 md:flex-row md:items-center md:justify-between">
              <div>
                <AdminPanelTitle>Delivery Thresholds</AdminPanelTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Amounts are saved in dollars. Deliverables unlock when total paid meets or passes the threshold.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddThreshold}>
                <Plus className="mr-2 h-4 w-4" />
                Add Threshold
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {drafts.length === 0 ? (
                <AdminPanelInset className="text-sm text-muted-foreground">
                  No thresholds configured yet.
                </AdminPanelInset>
              ) : (
                drafts.map((draft, index) => (
                  <AdminPanelInset key={draft.id} className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300">
                        Threshold {index + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveThreshold(draft.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={draft.label}
                          onChange={(event) => updateDraft(draft.id, "label", event.target.value)}
                          placeholder="Launch Tier"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.amount}
                          onChange={(event) => updateDraft(draft.id, "amount", event.target.value)}
                          placeholder="1500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={draft.description}
                        onChange={(event) =>
                          updateDraft(draft.id, "description", event.target.value)
                        }
                        placeholder="Optional internal note"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Deliverables Unlocked</Label>
                      <Textarea
                        rows={4}
                        value={draft.deliverablesText}
                        onChange={(event) =>
                          updateDraft(draft.id, "deliverablesText", event.target.value)
                        }
                        placeholder={"Homepage production pass\nClient feedback queue\nLaunch checklist"}
                      />
                    </div>
                  </AdminPanelInset>
                ))
              )}
            </CardContent>
          </AdminPanel>

          <div className="space-y-6">
            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle>Infrastructure Cost</AdminPanelTitle>
              </CardHeader>
              <CardContent>
                {data.infrastructureCosts.length === 0 ? (
                  <AdminPanelInset className="text-sm text-muted-foreground">
                    No services are currently attributed to this client.
                  </AdminPanelInset>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/70">
                    <Table>
                      <TableHeader className="admin-table-head">
                        <TableRow className="admin-table-row hover:bg-transparent">
                          <TableHead>Service</TableHead>
                          <TableHead>Attributed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.infrastructureCosts.map((item) => (
                          <TableRow key={item.serviceId} className="admin-table-row">
                            <TableCell>
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.vendor} · {item.category}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-foreground">
                                {formatCurrency(item.attributedMonthlyCost)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.attribution}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </AdminPanel>

            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle>Stripe History</AdminPanelTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.stripeError ? (
                  <AdminPanelInset className="border-amber-500/30 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-300">
                    {data.stripeError}
                  </AdminPanelInset>
                ) : null}
                {data.payments.length === 0 ? (
                  <AdminPanelInset className="text-sm text-muted-foreground">
                    No Stripe payments recorded yet.
                  </AdminPanelInset>
                ) : (
                  <div className="space-y-3">
                    {data.payments.map((payment) => (
                      <AdminPanelInset key={payment.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payment.createdAt)} · {payment.status}
                            </p>
                          </div>
                          <CreditCard className="h-5 w-5 text-orange-400" />
                        </div>
                        {payment.description ? (
                          <p className="text-sm text-muted-foreground">{payment.description}</p>
                        ) : null}
                      </AdminPanelInset>
                    ))}
                  </div>
                )}
              </CardContent>
            </AdminPanel>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
