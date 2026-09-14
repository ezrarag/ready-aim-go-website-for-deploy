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
  Printer,
  Copy,
  Check,
  Globe,
  Mail,
  Smartphone,
  ShieldCheck,
  ArrowRight,
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
  clientId: string
  contractId?: string | null
  workspaceId?: string | null
  invoiceNumber: string
  title: string
  status: "draft" | "client_review" | "accepted" | "paid" | "cancelled"
  totalCents: number
  subtotalCents?: number
  installmentIndex?: number | null
  milestoneLabel?: string | null
  renderedHtml?: string | null
  issueDate?: string
  dueDate?: string
  billTo?: {
    name?: string
    company?: string
    email?: string
  }
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function formatDate(value?: string | null) {
  if (!value) return "N/A"
  if (value.toLowerCase().includes("receipt")) return "Upon receipt"
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
  const [generatedInvoiceModal, setGeneratedInvoiceModal] = useState<Invoice | null>(null)
  const [showDeliveryMethodsModal, setShowDeliveryMethodsModal] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
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

      let loadedContracts: Contract[] = Array.isArray(contractsPayload.data) ? contractsPayload.data : []
      let loadedInvoices: Invoice[] = Array.isArray(invoicesPayload.data) ? invoicesPayload.data : []

      // If contracts or Together for Homes missing/unseeded, auto trigger seed
      if (loadedContracts.length === 0 || !loadedContracts.some((c) => c.id === "RAG-TFH-MW1")) {
        console.log("Auto-seeding Together for Homes canonical contract...")
        const seedRes = await fetch("/api/admin/seed-contracts", { method: "POST" })
        if (seedRes.ok) {
          const freshContracts = await fetch("/api/contracts", { cache: "no-store" }).then((r) => r.json())
          const freshInvoices = await fetch("/api/admin/invoices", { cache: "no-store" }).then((r) => r.json())
          if (Array.isArray(freshContracts?.data)) loadedContracts = freshContracts.data
          if (Array.isArray(freshInvoices?.data)) loadedInvoices = freshInvoices.data
        }
      }

      setContracts(loadedContracts)
      setInvoices(loadedInvoices)
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
      if (!res.ok || !data?.success || !data?.data) {
        throw new Error(data?.error || "Failed to generate next invoice")
      }
      const newInvoice = data.data as Invoice
      setGeneratedInvoiceModal(newInvoice)
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

  const copyPaymentLink = (invoiceId: string) => {
    const url = `${window.location.origin}/admin/invoices/${encodeURIComponent(invoiceId)}/print`
    void navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeliveryMethodsModal(true)}
              className="gap-2 text-xs border-dashed"
            >
              <Send className="h-4 w-4 text-blue-500" /> Delivery Methods
            </Button>
            <Button
              variant="outline"
              onClick={handleSeed}
              disabled={seeding}
              className="gap-2 border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-xs"
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
              const contractInvoices = invoices.filter(
                (inv) => inv.contractId === contract.id || inv.id.includes(contract.id) || (inv as any).workspaceId === contract.workspaceId
              )
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
                        <h4 className="text-xs font-mono font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-orange-500" /> Milestone Pipeline & Billing
                        </h4>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleGenerateInvoice(contract.id)}
                          disabled={generatingId === contract.id}
                          className="h-8 gap-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {generatingId === contract.id ? "Generating Invoice..." : "Generate Next Invoice"}
                        </Button>
                      </div>

                      {milestones.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No milestones defined for this contract.</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-3">
                          {milestones.map((milestone, idx) => {
                            const milestoneInvoice =
                              contractInvoices.find(
                                (inv) => inv.status === "paid" && (inv.installmentIndex === idx || inv.milestoneLabel === milestone || inv.id.endsWith(`-${idx + 1}`) || inv.id === contract.id)
                              ) ||
                              contractInvoices.find(
                                (inv) => inv.installmentIndex === idx || inv.milestoneLabel === milestone || inv.id.endsWith(`-${idx + 1}`)
                              )
                            const amount = amounts[idx] ?? Math.round((contract.totalContractValueCents || 0) / milestones.length)
                            const isPaid = milestoneInvoice?.status === "paid"
                            const isReview = milestoneInvoice?.status === "client_review" || milestoneInvoice?.status === "accepted"
                            const isDraft = milestoneInvoice?.status === "draft"

                            return (
                              <div
                                key={idx}
                                className={`rounded-lg border p-4 transition-colors ${
                                  isPaid
                                    ? "bg-emerald-500/10 border-emerald-500/40"
                                    : isReview
                                    ? "bg-amber-500/10 border-amber-500/40"
                                    : isDraft
                                    ? "bg-blue-500/5 border-blue-500/20"
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
                                      className={
                                        isPaid
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                          : isReview
                                          ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10"
                                          : "border-muted-foreground text-muted-foreground"
                                      }
                                    >
                                      {isPaid ? "PAID" : isReview ? "Awaiting Payment" : milestoneInvoice.status}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-muted-foreground">Not yet due</Badge>
                                  )}
                                </div>

                                <div className="text-sm font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">
                                  {milestone}
                                </div>

                                <div className="mt-3 flex items-center justify-between pt-2 border-t text-xs">
                                  <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                                  {milestoneInvoice && (
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={`/admin/invoices/${encodeURIComponent(milestoneInvoice.id)}/print`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline px-1.5 py-0.5 rounded hover:bg-blue-50"
                                      >
                                        <Printer className="h-3 w-3" /> PDF
                                      </a>
                                      {milestoneInvoice.renderedHtml && (
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
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions & Workspace Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>Created: {formatDate(contract.createdAt)}</span>
                        <span className="font-mono text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                          Workspace: {contract.workspaceId || "Global"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedContract(contract)}
                        className="gap-1 text-xs"
                      >
                        View Full Contract <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* NEWLY GENERATED INVOICE CONFIRMATION MODAL */}
        <Dialog open={Boolean(generatedInvoiceModal)} onOpenChange={(open) => !open && setGeneratedInvoiceModal(null)}>
          <DialogContent className="max-w-xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" /> Invoice Generated Successfully!
              </div>
            </DialogHeader>

            {generatedInvoiceModal && (
              <div className="space-y-6 pt-2">
                <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-orange-600 dark:text-orange-400">
                      {generatedInvoiceModal.id}
                    </span>
                    <Badge className="bg-amber-500 text-white font-semibold">Awaiting Payment</Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground">{generatedInvoiceModal.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Milestone: {generatedInvoiceModal.milestoneLabel || "Milestone Item"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-sm font-semibold">
                    <span>Total Amount Due:</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(generatedInvoiceModal.totalCents)}
                    </span>
                  </div>
                </div>

                {/* Workspace & Client Attachment Indicators */}
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                    <ShieldCheck className="h-4 w-4 text-blue-500" /> Attached & Synced to Systems:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground pl-6">
                    <div>• Workspace: <span className="font-mono font-semibold text-foreground">{generatedInvoiceModal.workspaceId || "Global"}</span></div>
                    <div>• Client: <span className="font-semibold text-foreground">{generatedInvoiceModal.billTo?.name || generatedInvoiceModal.clientId}</span></div>
                    <div>• Contract: <span className="font-mono font-semibold text-foreground">{generatedInvoiceModal.contractId}</span></div>
                    <div>• Status: <span className="font-semibold text-amber-600">Client Review</span></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a
                    href={`/admin/invoices/${encodeURIComponent(generatedInvoiceModal.id)}/print`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg bg-foreground text-background font-semibold py-2.5 text-xs hover:opacity-90 transition-opacity"
                  >
                    <Printer className="h-4 w-4" /> Download / Print PDF
                  </a>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewHtml(generatedInvoiceModal.renderedHtml || null)
                      setPreviewTitle(`${generatedInvoiceModal.invoiceNumber} — ${generatedInvoiceModal.title}`)
                    }}
                    className="gap-2 text-xs"
                  >
                    <Eye className="h-4 w-4 text-orange-500" /> Preview HTML
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => copyPaymentLink(generatedInvoiceModal.id)}
                    className="gap-2 text-xs col-span-2"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copiedLink ? "Print URL Copied to Clipboard!" : "Copy Printable PDF Link"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DELIVERY METHODS EXPLAINER MODAL */}
        <Dialog open={showDeliveryMethodsModal} onOpenChange={setShowDeliveryMethodsModal}>
          <DialogContent className="max-w-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" /> ReadyAimGo Invoicing Delivery Channels
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-3 text-sm text-muted-foreground">
              <p>
                Our system uses 5 active delivery methods to ensure clients receive and process milestone invoices seamlessly:
              </p>

              <div className="space-y-3 border-t pt-3">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-blue-500" /> Client Portal Auto-Sync (`clients.readyaimgo.biz`)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Invoices automatically display in the client&apos;s private portal under their billing tab upon generation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-orange-500" /> Email Dispatch (`support@readyaimgo.biz`)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send email notification directly to the client contact (`friends@1kfriends.org`) with embedded PDF view links.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                      <Printer className="h-4 w-4 text-emerald-500" /> Instant PDF & Standalone Printable View
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Each invoice has a dedicated print URL (`/admin/invoices/[invoiceId]/print`) formatted for 1-click PDF download.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 font-bold">4</div>
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-purple-500" /> Direct Electronic & Stripe Options
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Embedded payment options for Stripe Card checkout, Zelle (`haugabr2@uwm.edu`), Apple Cash, and ACH Bank Transfer (`UWM Credit Union`).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0 font-bold">5</div>
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-slate-500" /> Native macOS Desktop Sync (`raCommand`)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Real-time synchronization with `raCommand` desktop app for single-click invoice generation from your native workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
