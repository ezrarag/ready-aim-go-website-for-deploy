"use client"

import { useEffect, useMemo, useState } from "react"
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  DollarSign,
  Building2,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  Printer,
  Mail,
  Check,
  Copy,
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

interface Invoice {
  id: string
  clientId: string
  contractId?: string | null
  workspaceId?: string | null
  templateId: string
  invoiceNumber: string
  title: string
  status: "draft" | "client_review" | "accepted" | "paid" | "cancelled"
  issueDate: string
  dueDate: string
  billingPeriod?: string
  totalCents: number
  subtotalCents?: number
  paidAt?: string | null
  renderedHtml?: string | null
  paymentLink?: string | null
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

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/invoices", { cache: "no-store" })
      const payload = await res.json().catch(() => ({}))
      if (payload?.success && Array.isArray(payload.data)) {
        setInvoices(payload.data)
      } else {
        throw new Error(payload?.error || "Failed to load invoices")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchInvoices()
  }, [])

  const handleUpdateStatus = async (invoice: Invoice, newStatus: string) => {
    setUpdatingId(invoice.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoice.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: invoice.clientId,
          status: newStatus,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || `Failed to update status to ${newStatus}`)
      }
      await fetchInvoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update invoice status")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCopyLink = (invoiceId: string) => {
    const url = `${window.location.origin}/admin/invoices/${encodeURIComponent(invoiceId)}/print`
    void navigator.clipboard.writeText(url)
    setCopiedId(invoiceId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleEmailClient = (invoice: Invoice) => {
    const printUrl = `${window.location.origin}/admin/invoices/${encodeURIComponent(invoice.id)}/print`
    const email = invoice.billTo?.email || "friends@1kfriends.org"
    const subject = encodeURIComponent(`ReadyAimGo Invoice — ${invoice.invoiceNumber} (${invoice.title})`)
    const body = encodeURIComponent(
      `Hello ${invoice.billTo?.name || "Team"},\n\nPlease review your invoice ${invoice.invoiceNumber} for ${invoice.title} ($${(invoice.totalCents / 100).toFixed(2)}).\n\nView / Download PDF Invoice: ${printUrl}\n\nThank you,\nEzra Haugabrooks\nReadyAimGo`
    )
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank")
    setEmailStatusMessage(`Prepared email draft for ${email}`)
    setTimeout(() => setEmailStatusMessage(null), 3000)
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        searchQuery === "" ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.clientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.billTo?.company || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [invoices, searchQuery, statusFilter])

  const stats = useMemo(() => {
    const totalBilled = invoices.reduce((acc, inv) => acc + (inv.totalCents || 0), 0)
    const paidInvoices = invoices.filter((inv) => inv.status === "paid")
    const totalCollected = paidInvoices.reduce((acc, inv) => acc + (inv.totalCents || 0), 0)
    const outstandingUnpaid = totalBilled - totalCollected

    return {
      totalCount: invoices.length,
      paidCount: paidInvoices.length,
      totalBilled,
      totalCollected,
      outstandingUnpaid,
    }
  }, [invoices])

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-orange-500 uppercase">
              <Layers className="h-4 w-4" /> ReadyAimGo Billing Portal
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">
              Admin Invoices & Billing
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View all client milestone invoices, manage payment states, and inspect live HTML rendered invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={fetchInvoices} variant="outline" size="sm" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Invoices
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {emailStatusMessage && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" />
            <span>{emailStatusMessage}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Invoices
              </CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all clients</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Billed
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalBilled)}</div>
              <p className="text-xs text-muted-foreground mt-1">Sum of all invoices</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Collected
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats.totalCollected)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stats.paidCount} paid invoices</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Outstanding Balance
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(stats.outstandingUnpaid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Unpaid / pending review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice # or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {["all", "draft", "client_review", "accepted", "paid", "cancelled"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="capitalize text-xs"
              >
                {st.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        {/* Invoice Cards / Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-4 text-lg font-semibold">No invoices found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Go to the Contracts page to generate milestone invoices for your active contracts.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredInvoices.map((invoice) => {
              const isPaid = invoice.status === "paid"
              const isReview = invoice.status === "client_review"
              const isDraft = invoice.status === "draft"

              return (
                <Card key={invoice.id} className="overflow-hidden border hover:border-orange-500/30 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      {/* Left Block */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-foreground/5 text-foreground">
                            {invoice.invoiceNumber}
                          </span>
                          <Badge
                            variant={isPaid ? "default" : "outline"}
                            className={
                              isPaid
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                : isReview
                                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10"
                                : isDraft
                                ? "border-muted-foreground text-muted-foreground"
                                : ""
                            }
                          >
                            {isPaid ? "PAID" : isReview ? "Awaiting Payment" : invoice.status.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            Client: {invoice.billTo?.company || invoice.clientId}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-foreground">{invoice.title}</h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Issued: {formatDate(invoice.issueDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Due: {formatDate(invoice.dueDate)}
                          </span>
                          {invoice.paidAt && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Paid on {formatDate(invoice.paidAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Block */}
                      <div className="flex flex-col md:items-end gap-3 shrink-0">
                        <div className="text-2xl font-bold text-foreground">
                          {formatCurrency(invoice.totalCents)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`/admin/invoices/${encodeURIComponent(invoice.id)}/print`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                          >
                            <Printer className="h-3.5 w-3.5 text-blue-500" /> Print PDF
                          </a>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEmailClient(invoice)}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <Mail className="h-3.5 w-3.5 text-orange-500" /> Email
                          </Button>

                          {invoice.renderedHtml && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPreviewHtml(invoice.renderedHtml || null)
                                setPreviewTitle(`${invoice.invoiceNumber} — ${invoice.title}`)
                              }}
                              className="h-8 gap-1.5 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" /> Preview
                            </Button>
                          )}

                          {!isPaid && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(invoice, "paid")}
                              disabled={updatingId === invoice.id}
                              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                            </Button>
                          )}

                          {isDraft && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleUpdateStatus(invoice, "client_review")}
                              disabled={updatingId === invoice.id}
                              className="h-8 text-xs"
                            >
                              Send for Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Preview Modal */}
        <Dialog open={Boolean(previewHtml)} onOpenChange={(open) => !open && setPreviewHtml(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>{previewTitle || "Invoice HTML Preview"}</DialogTitle>
            </DialogHeader>
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[700px] border-0 rounded-lg bg-white"
                title="Invoice Preview Frame"
              />
            ) : (
              <div className="p-8 text-center text-muted-foreground">No HTML preview available.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
