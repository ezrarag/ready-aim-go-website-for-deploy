"use client"

import { useEffect, useMemo, useState } from "react"
import {
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Send,
  Zap,
  Building2,
  DollarSign,
  ChevronRight,
  Layers,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Contract {
  id: string
  clientId: string
  clientName?: string
  clientEmail?: string
  workspaceId?: string | null
  title: string
  summary?: string
  contractType: string
  status: string
  totalContractValueCents?: number
  monthlyValue?: number
  pricingCadence?: string
  paymentDates?: string[]
  milestoneAmountsCents?: number[]
  createdAt?: string
  notes?: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  title: string
  status: string
  totalCents: number
  installmentIndex?: number | null
  milestoneLabel?: string | null
  renderedHtml?: string | null
  issueDate?: string
  dueDate?: string
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function formatDate(value?: string | null) {
  if (!value) return "N/A"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [contractsRes, invoicesRes] = await Promise.all([
        fetch("/api/contracts", { cache: "no-store" }),
        fetch("/api/admin/invoices", { cache: "no-store" }),
      ])

      const contractsPayload = await contractsRes.json().catch(() => ({}))
      const invoicesPayload = await invoicesRes.json().catch(() => ({}))

      if (contractsPayload?.success && Array.isArray(contractsPayload.data)) {
        setContracts(contractsPayload.data)
      }
      if (invoicesPayload?.success && Array.isArray(invoicesPayload.data)) {
        setInvoices(invoicesPayload.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const handleSeed = async () => {
    setSeeding(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/seed-contracts", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to seed contracts")
      }
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed contracts")
    } finally {
      setSeeding(false)
    }
  }

  const handleGenerateInvoice = async (contractId: string) => {
    setGeneratingId(contractId)
    setError(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}/generate-invoice`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to generate next invoice")
      }
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invoice")
    } finally {
      setGeneratingId(null)
    }
  }

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        searchQuery === "" ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.clientName || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [contracts, searchQuery, statusFilter])

  const totalValueCents = useMemo(() => {
    return contracts.reduce((acc, c) => acc + (c.totalContractValueCents || 0), 0)
  }, [contracts])

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-orange-500 uppercase">
              <Zap className="h-4 w-4" /> ReadyAimGo Admin Platform
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">
              Contracts & Milestone Pipelines
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage client agreements, track milestone billing pipelines, and generate instant snapshot invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSeed}
              disabled={seeding}
              className="gap-2 border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            >
              <RefreshCw className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? "Syncing..." : "Sync / Seed TFH Contracts"}
            </Button>
            <Button onClick={fetchData} variant="secondary" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Contracts
              </CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all clients & workspaces</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Active Contracts
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contracts.filter((c) => c.status === "active" || c.status === "signed").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">In active delivery</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Portfolio Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValueCents)}</div>
              <p className="text-xs text-muted-foreground mt-1">Combined contract value</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Invoices Generated
              </CardTitle>
              <Layers className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Milestone & custom invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search contracts or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {["all", "active", "draft", "signed", "expired"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Contracts List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading contracts...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-4 text-lg font-semibold">No contracts found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Sync / Seed TFH Contracts&quot; above to initialize Together for Homes agreements.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredContracts.map((contract) => {
              const contractInvoices = invoices.filter((inv) => inv.id.includes(contract.id) || (inv as any).contractId === contract.id)
              const milestones = contract.paymentDates || []
              const amounts = contract.milestoneAmountsCents || []

              return (
                <Card key={contract.id} className="overflow-hidden border shadow-sm">
                  <CardHeader className="bg-muted/30 pb-4 border-b">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            {contract.id}
                          </span>
                          <Badge variant={contract.status === "active" ? "default" : "secondary"}>
                            {contract.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize font-mono">
                            {contract.contractType.replace("_", " ")}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-foreground">{contract.title}</h2>
                        {contract.summary && (
                          <p className="text-sm text-muted-foreground">{contract.summary}</p>
                        )}
                      </div>

                      <div className="text-left md:text-right mt-2 md:mt-0">
                        <div className="text-2xl font-bold text-foreground">
                          {formatCurrency(contract.totalContractValueCents || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 md:justify-end mt-0.5">
                          <Building2 className="h-3.5 w-3.5" /> Client: {contract.clientName || contract.clientId}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Milestone Pipeline */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-mono font-semibold uppercase text-muted-foreground tracking-wider">
                          Milestone Pipeline & Billing
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateInvoice(contract.id)}
                          disabled={generatingId === contract.id}
                          className="h-8 gap-1.5 text-xs font-semibold"
                        >
                          <Zap className="h-3.5 w-3.5 text-orange-500" />
                          {generatingId === contract.id ? "Generating..." : "Generate Next Invoice"}
                        </Button>
                      </div>

                      {milestones.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No milestones defined for this contract.</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-3">
                          {milestones.map((milestone, idx) => {
                            const milestoneInvoice = contractInvoices.find((inv) => inv.installmentIndex === idx)
                            const amount = amounts[idx] ?? Math.round((contract.totalContractValueCents || 0) / milestones.length)
                            const isPaid = milestoneInvoice?.status === "paid"
                            const isReview = milestoneInvoice?.status === "client_review"

                            return (
                              <div
                                key={idx}
                                className={`rounded-lg border p-4 transition-colors ${
                                  isPaid
                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                    : isReview
                                    ? "bg-amber-500/5 border-amber-500/30"
                                    : "bg-card border-border"
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <span className="font-mono font-semibold text-muted-foreground">
                                    Milestone {idx + 1}
                                  </span>
                                  {milestoneInvoice ? (
                                    <Badge
                                      variant={isPaid ? "default" : "outline"}
                                      className={isPaid ? "bg-emerald-600" : isReview ? "border-amber-500 text-amber-600" : ""}
                                    >
                                      {milestoneInvoice.status}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Pending</Badge>
                                  )}
                                </div>

                                <div className="text-sm font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">
                                  {milestone}
                                </div>

                                <div className="mt-3 flex items-center justify-between pt-2 border-t text-xs">
                                  <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                                  {milestoneInvoice && milestoneInvoice.renderedHtml && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setPreviewHtml(milestoneInvoice.renderedHtml || null)
                                        setPreviewTitle(`${milestoneInvoice.invoiceNumber} — ${milestoneInvoice.title}`)
                                      }}
                                      className="h-7 px-2 gap-1 text-xs text-orange-600"
                                    >
                                      <Eye className="h-3 w-3" /> Preview
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
                      <div>
                        Created: {formatDate(contract.createdAt)} | Workspace: {contract.workspaceId || "Global"}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedContract(contract)}
                        className="gap-1 text-xs"
                      >
                        View Details <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* HTML Invoice Preview Dialog */}
        <Dialog open={Boolean(previewHtml)} onOpenChange={(open) => !open && setPreviewHtml(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>{previewTitle || "Invoice Preview"}</DialogTitle>
            </DialogHeader>
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[700px] border-0 rounded-lg bg-white"
                title="Invoice HTML Preview"
              />
            ) : (
              <div className="p-8 text-center text-muted-foreground">No preview HTML available.</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Contract Detail Dialog */}
        <Dialog open={Boolean(selectedContract)} onOpenChange={(open) => !open && setSelectedContract(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedContract?.title}</DialogTitle>
            </DialogHeader>
            {selectedContract && (
              <div className="space-y-4 text-sm pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-mono uppercase block">Contract ID</span>
                    <span className="font-semibold">{selectedContract.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-mono uppercase block">Client ID</span>
                    <span className="font-semibold">{selectedContract.clientId}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-mono uppercase block">Status</span>
                    <Badge variant="outline" className="mt-1">{selectedContract.status}</Badge>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-mono uppercase block">Total Value</span>
                    <span className="font-semibold">{formatCurrency(selectedContract.totalContractValueCents || 0)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground font-mono uppercase block">Summary / Notes</span>
                  <p className="mt-1 text-muted-foreground">{selectedContract.summary || selectedContract.notes || "No additional notes."}</p>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground font-mono uppercase block mb-2">Milestones</span>
                  <ul className="space-y-2">
                    {(selectedContract.paymentDates || []).map((m, idx) => (
                      <li key={idx} className="flex items-center justify-between border-b pb-1 text-xs">
                        <span>{idx + 1}. {m}</span>
                        <span className="font-bold">
                          {formatCurrency((selectedContract.milestoneAmountsCents || [])[idx] ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
