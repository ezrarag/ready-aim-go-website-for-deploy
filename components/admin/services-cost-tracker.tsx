"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight, ExternalLink, FileText, FolderKanban, Plus, RefreshCw, Server } from "lucide-react"
import { toast } from "sonner"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useRAGServices } from "@/hooks/use-rag-services"
import {
  getRAGServiceStatus,
  RAG_SERVICE_CATEGORY_OPTIONS,
  type RAGService,
  type RAGServiceCategory,
  type RAGServiceStatus,
} from "@/lib/rag-services"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"

type ServiceFormState = {
  name: string
  vendor: string
  category: RAGServiceCategory
  monthlyCost: string
  nextDueDate: string
  receiptUrl: string
  dependentProjects: string
  notes: string
}

const INITIAL_FORM_STATE: ServiceFormState = {
  name: "",
  vendor: "",
  category: "Hosting & Delivery",
  monthlyCost: "",
  nextDueDate: "",
  receiptUrl: "",
  dependentProjects: "",
  notes: "",
}

const STATUS_STYLES: Record<RAGServiceStatus, string> = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "due-soon":
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  overdue: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
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

function formatDisplayDate(value: string) {
  if (!value) {
    return "Not set"
  }

  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return dateFormatter.format(parsed)
}

function formatStatusLabel(status: RAGServiceStatus) {
  if (status === "due-soon") {
    return "Due Soon"
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

function summarizeProjects(service: RAGService) {
  if (service.dependentProjects.length === 0) {
    return "No linked projects"
  }

  if (service.dependentProjects.length === 1) {
    return service.dependentProjects[0]
  }

  return `${service.dependentProjects[0]} +${service.dependentProjects.length - 1}`
}

export function ServicesCostTracker() {
  const { services, summary, loading, error, seeded, refresh } = useRAGServices()
  const [detailServiceId, setDetailServiceId] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState<ServiceFormState>(INITIAL_FORM_STATE)

  const selectedService = useMemo(
    () => services.find((service) => service.id === detailServiceId) ?? null,
    [detailServiceId, services]
  )

  const groupedServices = useMemo(() => {
    const groups = new Map<RAGServiceCategory, RAGService[]>()

    for (const service of services) {
      const existing = groups.get(service.category) ?? []
      existing.push(service)
      groups.set(service.category, existing)
    }

    return Array.from(groups.entries()).map(([category, categoryServices]) => ({
      category,
      services: categoryServices,
      totalMonthlyCost: categoryServices.reduce(
        (runningTotal, service) => runningTotal + service.monthlyCost,
        0
      ),
    }))
  }, [services])

  const resetForm = () => {
    setForm(INITIAL_FORM_STATE)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleQuickAddChange = <Key extends keyof ServiceFormState>(
    key: Key,
    value: ServiceFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSaveService = async () => {
    if (
      form.name.trim().length === 0 ||
      form.vendor.trim().length === 0 ||
      form.nextDueDate.trim().length === 0 ||
      form.monthlyCost.trim().length === 0
    ) {
      toast.error("Complete the service form before saving.")
      return
    }

    const monthlyCost = Number(form.monthlyCost)
    if (!Number.isFinite(monthlyCost) || monthlyCost < 0) {
      toast.error("Monthly cost must be a valid non-negative number.")
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          vendor: form.vendor.trim(),
          category: form.category,
          monthlyCost,
          nextDueDate: form.nextDueDate,
          receiptUrl: form.receiptUrl.trim(),
          dependentProjects: form.dependentProjects
            .split(/[\n,]/)
            .map((project) => project.trim())
            .filter(Boolean),
          notes: form.notes.trim(),
        }),
      })

      const payload = (await response.json()) as {
        success?: boolean
        service?: RAGService
        error?: string
      }

      if (!response.ok || !payload.success || !payload.service) {
        throw new Error(payload.error || "Unable to create service.")
      }

      toast.success(`${payload.service.name} added to infrastructure services.`)
      setQuickAddOpen(false)
      resetForm()
      setDetailServiceId(payload.service.id)
      await refresh()
    } catch (saveError) {
      console.error(saveError)
      toast.error(
        saveError instanceof Error ? saveError.message : "Unable to create service."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_58%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.12),_transparent_34%)]" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-[0_0_30px_-18px_rgba(249,115,22,0.85)]">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Infrastructure Services</h1>
              <p className="text-sm text-muted-foreground">
                Recurring RAG dependency costs, due dates, receipts, and project impact in one tactical view.
              </p>
            </div>
          </div>
          {seeded ? (
            <Badge className="border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300">
              Firestore was empty and auto-seeded with the current RAG stack.
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-border/70 bg-card/80"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            className="bg-orange-600 text-white hover:bg-orange-500"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Quick Add
          </Button>
        </div>
      </div>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Cost Snapshot</AdminPanelTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <AdminMetricTile
            label="Total Monthly Cost"
            value={formatCurrency(summary.totalMonthlyCost)}
            hint={`${services.length} tracked service${services.length === 1 ? "" : "s"}`}
            labelClassName="text-xs uppercase tracking-[0.2em]"
          />
          <AdminMetricTile
            label="Overdue"
            value={summary.overdueCount}
            hint="Services with billing dates already passed"
            labelClassName="text-xs uppercase tracking-[0.2em]"
            valueClassName={
              summary.overdueCount > 0 ? "text-red-600 dark:text-red-400" : undefined
            }
          />
          <AdminMetricTile
            label="Due This Week"
            value={summary.dueThisWeekCount}
            hint="Upcoming renewals inside the next seven days"
            labelClassName="text-xs uppercase tracking-[0.2em]"
            valueClassName={
              summary.dueThisWeekCount > 0
                ? "text-orange-600 dark:text-orange-400"
                : undefined
            }
          />
        </CardContent>
      </AdminPanel>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Service Ledger</AdminPanelTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <AdminPanelInset>
              <p className="text-sm text-muted-foreground">Loading Firestore-backed service costs...</p>
            </AdminPanelInset>
          ) : error ? (
            <AdminPanelInset className="border-red-500/20 bg-red-500/5">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => void handleRefresh()}>
                Retry
              </Button>
            </AdminPanelInset>
          ) : groupedServices.length === 0 ? (
            <AdminPanelInset>
              <p className="text-sm text-muted-foreground">
                No services are tracked yet. Use Quick Add to start the ledger.
              </p>
            </AdminPanelInset>
          ) : (
            groupedServices.map((group) => (
              <div key={group.category} className="space-y-3">
                <div className="flex flex-col gap-2 border-b border-border/60 pb-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{group.category}</h2>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {group.services.length} service{group.services.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="w-fit border border-border/60 bg-muted/40">
                    {formatCurrency(group.totalMonthlyCost)} / month
                  </Badge>
                </div>

                <div className="overflow-hidden rounded-xl border border-border/70">
                  <Table>
                    <TableHeader className="admin-table-head">
                      <TableRow className="admin-table-row hover:bg-transparent">
                        <TableHead>Service</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Monthly Cost</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dependent Projects</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.services.map((service) => {
                        const status = getRAGServiceStatus(service)

                        return (
                          <TableRow
                            key={service.id}
                            className="admin-table-row cursor-pointer"
                            onClick={() => setDetailServiceId(service.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                setDetailServiceId(service.id)
                              }
                            }}
                            tabIndex={0}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{service.name}</p>
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  {service.category}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{service.vendor}</TableCell>
                            <TableCell className="font-medium text-foreground">
                              {formatCurrency(service.monthlyCost)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDisplayDate(service.nextDueDate)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`border ${STATUS_STYLES[status]}`}>
                                {formatStatusLabel(status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {summarizeProjects(service)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </AdminPanel>

      <Sheet
        open={Boolean(selectedService)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailServiceId(null)
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto border-l border-border bg-background/95 sm:max-w-2xl">
          {selectedService ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedService.name}</SheetTitle>
                <SheetDescription>
                  {selectedService.vendor} · {selectedService.category}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminPanelInset>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Monthly Cost
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {formatCurrency(selectedService.monthlyCost)}
                    </p>
                  </AdminPanelInset>
                  <AdminPanelInset>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Billing Status
                    </p>
                    <div className="mt-3">
                      <Badge
                        className={`border ${
                          STATUS_STYLES[getRAGServiceStatus(selectedService)]
                        }`}
                      >
                        {formatStatusLabel(getRAGServiceStatus(selectedService))}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Next due {formatDisplayDate(selectedService.nextDueDate)}
                    </p>
                  </AdminPanelInset>
                </div>

                <AdminPanelInset className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Receipt URL
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        <span className="break-all">
                          {selectedService.receiptUrl?.trim()
                            ? selectedService.receiptUrl
                            : "No receipt URL linked yet."}
                        </span>
                      </p>
                    </div>
                    {selectedService.receiptUrl?.trim() ? (
                      <Button variant="outline" asChild className="shrink-0">
                        <a
                          href={selectedService.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </AdminPanelInset>

                <AdminPanelInset className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4 text-orange-400" />
                    Notes
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {selectedService.notes?.trim() || "No notes recorded for this service yet."}
                  </p>
                </AdminPanelInset>

                <AdminPanelInset className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FolderKanban className="h-4 w-4 text-cyan-400" />
                    Dependent Projects
                  </div>
                  {selectedService.dependentProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No dependent projects listed.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedService.dependentProjects.map((project) => (
                        <Badge
                          key={project}
                          variant="secondary"
                          className="border border-border/60 bg-muted/40"
                        >
                          {project}
                        </Badge>
                      ))}
                    </div>
                  )}
                </AdminPanelInset>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={quickAddOpen}
        onOpenChange={(open) => {
          setQuickAddOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="border-border bg-background sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick Add Service</DialogTitle>
            <DialogDescription>
              Capture a new recurring dependency with billing context, receipt linkage, and affected projects.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-name">Service Name</Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(event) => handleQuickAddChange("name", event.target.value)}
                placeholder="OpenAI API"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-vendor">Vendor</Label>
              <Input
                id="service-vendor"
                value={form.vendor}
                onChange={(event) => handleQuickAddChange("vendor", event.target.value)}
                placeholder="OpenAI"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  handleQuickAddChange("category", value as RAGServiceCategory)
                }
              >
                <SelectTrigger id="service-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {RAG_SERVICE_CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-cost">Monthly Cost</Label>
              <Input
                id="service-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyCost}
                onChange={(event) => handleQuickAddChange("monthlyCost", event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-due-date">Next Due Date</Label>
              <Input
                id="service-due-date"
                type="date"
                value={form.nextDueDate}
                onChange={(event) => handleQuickAddChange("nextDueDate", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-receipt-url">Receipt URL</Label>
              <Input
                id="service-receipt-url"
                value={form.receiptUrl}
                onChange={(event) => handleQuickAddChange("receiptUrl", event.target.value)}
                placeholder="https://vendor.example/billing"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="service-projects">Dependent Projects</Label>
              <Textarea
                id="service-projects"
                value={form.dependentProjects}
                onChange={(event) =>
                  handleQuickAddChange("dependentProjects", event.target.value)
                }
                placeholder="One per line or comma-separated"
                rows={3}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="service-notes">Notes</Label>
              <Textarea
                id="service-notes"
                value={form.notes}
                onChange={(event) => handleQuickAddChange("notes", event.target.value)}
                placeholder="Billing owner, plan context, receipt notes, or renewal risk..."
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuickAddOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 text-white hover:bg-orange-500"
              onClick={() => void handleSaveService()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  Add Service
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
