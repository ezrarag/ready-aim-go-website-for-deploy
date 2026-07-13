"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { INVOICE_TEMPLATES } from "@/lib/invoice-templates"
import type { ClientInvoice } from "@/lib/types/client-invoices"

type InvoiceTemplateId = (typeof INVOICE_TEMPLATES)[number]["id"]

type ContractOption = {
  id: string
  title: string
  paymentDates?: string[]
}

function ContractMilestoneTimeline({
  contract,
  invoices,
  onBillMilestone,
}: {
  contract: ContractOption
  invoices: ClientInvoice[]
  onBillMilestone: (index: number) => void
}) {
  const milestones = contract.paymentDates || []
  if (milestones.length === 0) return null

  return (
    <div className="mt-4 border rounded-lg p-4 bg-muted/10">
      <p className="text-sm font-medium">Contract Milestones Progress</p>
      <div className="mt-4 relative flex flex-col space-y-4">
        {milestones.map((milestone, idx) => {
          const matchingInvoice = invoices.find(
            (inv) => inv.contractId === contract.id && inv.installmentIndex === idx
          )
          
          let status: "unbilled" | "draft" | "pending" | "paid" = "unbilled"
          if (matchingInvoice) {
            if (matchingInvoice.status === "paid") status = "paid"
            else if (matchingInvoice.status === "draft") status = "draft"
            else status = "pending"
          }

          return (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors border",
                    status === "paid"
                      ? "bg-emerald-500 text-white border-emerald-600"
                      : status === "pending"
                      ? "bg-orange-500 text-white border-orange-600"
                      : status === "draft"
                      ? "bg-blue-500 text-white border-blue-600"
                      : "bg-background text-muted-foreground border-input",
                  ].join(" ")}
                >
                  {idx + 1}
                </div>
                {idx < milestones.length - 1 && (
                  <div className="h-8 w-px bg-border mt-1 shrink-0" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={milestone}>{milestone}</p>
                    {matchingInvoice && (
                      <p className="text-xs text-muted-foreground">
                        Invoice {matchingInvoice.invoiceNumber} · Due {matchingInvoice.dueDate}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {status === "unbilled" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onBillMilestone(idx)}
                        className="h-7 text-xs px-2"
                      >
                        Bill Milestone
                      </Button>
                    ) : (
                      <Badge
                        variant="outline"
                        className={[
                          "text-xs border",
                          status === "paid"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : status === "pending"
                            ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        ].join(" ")}
                      >
                        {status === "paid" ? "Paid" : status === "pending" ? "Pending" : "Draft"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function WorkspaceInvoicesPanel({
  clientId,
  workspaceId,
  contracts,
  defaultBillTo,
}: {
  clientId: string | null
  workspaceId: string
  contracts: ContractOption[]
  defaultBillTo: {
    name: string
    company: string
    address: string
    email: string
  }
}) {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<ClientInvoice | null>(null)
  const [form, setForm] = useState({
    contractId: contracts[0]?.id || "",
    templateId: (INVOICE_TEMPLATES[0]?.id || "nexus") as InvoiceTemplateId,
    title: contracts[0]?.title ? `${contracts[0].title} invoice` : "New invoice",
    amount: "",
    billingPeriod: "",
    dueDate: "",
    description: "",
    billToName: defaultBillTo.name,
    billToCompany: defaultBillTo.company,
    billToAddress: defaultBillTo.address,
    billToEmail: defaultBillTo.email,
    installmentIndex: "" as "" | number,
  })

  const loadInvoices = async () => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/invoices`, { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to load invoices.")
      }
      setInvoices(Array.isArray(payload.data) ? payload.data : [])
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load invoices.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInvoices()
  }, [clientId])

  const createInvoice = async () => {
    if (!clientId) {
      setError("Link this workspace to a person before generating invoices.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const amountCents = Math.round(Number(form.amount || 0) * 100)
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          contractId: form.contractId || null,
          templateId: form.templateId,
          title: form.title,
          amountCents,
          billingPeriod: form.billingPeriod,
          dueDate: form.dueDate,
          description: form.description,
          billToName: form.billToName,
          billToCompany: form.billToCompany,
          billToAddress: form.billToAddress,
          billToEmail: form.billToEmail,
          installmentIndex: form.installmentIndex === "" ? null : form.installmentIndex,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to create invoice.")
      }
      setInvoices((current) => [payload.data as ClientInvoice, ...current])
      setForm((current) => ({ ...current, amount: "", description: "", installmentIndex: "" }))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create invoice.")
    } finally {
      setSaving(false)
    }
  }

  const saveInvoice = async (invoice: ClientInvoice) => {
    if (!clientId) return
    setError(null)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/invoices/${encodeURIComponent(invoice.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: invoice.title,
          status: invoice.status,
          billTo: invoice.billTo,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to save invoice.")
      }
      setInvoices((current) => current.map((entry) => (entry.id === invoice.id ? payload.data as ClientInvoice : entry)))
      if (previewInvoice?.id === invoice.id) {
        setPreviewInvoice(payload.data as ClientInvoice)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save invoice.")
    }
  }

  const createCheckoutLink = async (invoiceId: string) => {
    if (!clientId) return
    setCheckoutLoadingId(invoiceId)
    setError(null)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/invoices/${encodeURIComponent(invoiceId)}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to generate checkout link.")
      }
      const nextInvoice = payload.data?.invoice as ClientInvoice
      setInvoices((current) => current.map((entry) => (entry.id === invoiceId ? nextInvoice : entry)))
      if (previewInvoice?.id === invoiceId) setPreviewInvoice(nextInvoice)
      if (payload.data?.url) {
        window.open(payload.data.url as string, "_blank", "noopener,noreferrer")
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to generate checkout link.")
    } finally {
      setCheckoutLoadingId(null)
    }
  }

  const selectedContract = contracts.find((c) => c.id === form.contractId)
  const milestoneOptions = selectedContract?.paymentDates || []

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <p className="font-medium">Generate invoice from contract</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Phase 1 uses the branded HTML templates in <code>docs/invoices</code>, lets the client edit bill-to details, and then generates a Stripe payment link once accepted.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={form.contractId}
            onChange={(event) => setForm((current) => ({ ...current, contractId: event.target.value, title: current.title || `${contracts.find((entry) => entry.id === event.target.value)?.title || "Invoice"} invoice`, installmentIndex: "" }))}
          >
            <option value="">No contract linked</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>{contract.title}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={form.templateId}
            onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value as InvoiceTemplateId }))}
          >
            {INVOICE_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </select>
          {milestoneOptions.length > 0 && (
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-2"
              value={form.installmentIndex}
              onChange={(event) => {
                const val = event.target.value
                const idx = val === "" ? "" : parseInt(val, 10)
                setForm((current) => {
                  const prefillTitle = typeof idx === "number" ? `${selectedContract?.title || "Milestone"} - ${milestoneOptions[idx]}` : current.title
                  return {
                    ...current,
                    installmentIndex: idx,
                    title: prefillTitle,
                    description: typeof idx === "number" ? `Milestone payment for: ${milestoneOptions[idx]}` : current.description,
                  }
                })
              }}
            >
              <option value="">Select Milestone / Installment</option>
              {milestoneOptions.map((milestone, idx) => (
                <option key={idx} value={idx}>Milestone {idx + 1}: {milestone}</option>
              ))}
            </select>
          )}
          <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Invoice title" />
          <Input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount in USD" inputMode="decimal" />
          <Input value={form.billingPeriod} onChange={(event) => setForm((current) => ({ ...current, billingPeriod: event.target.value }))} placeholder="Billing period" />
          <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
          <Input value={form.billToName} onChange={(event) => setForm((current) => ({ ...current, billToName: event.target.value }))} placeholder="Bill-to name" />
          <Input value={form.billToCompany} onChange={(event) => setForm((current) => ({ ...current, billToCompany: event.target.value }))} placeholder="Bill-to company" />
          <Input value={form.billToEmail} onChange={(event) => setForm((current) => ({ ...current, billToEmail: event.target.value }))} placeholder="Bill-to email" />
          <Input value={form.billToAddress} onChange={(event) => setForm((current) => ({ ...current, billToAddress: event.target.value }))} placeholder="Bill-to address" />
        </div>
        <Textarea className="mt-3 min-h-[88px]" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Line item description override" />
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {selectedContract && milestoneOptions.length > 0 && (
          <ContractMilestoneTimeline
            contract={selectedContract}
            invoices={invoices}
            onBillMilestone={(idx) => {
              setForm((current) => ({
                ...current,
                installmentIndex: idx,
                title: `${selectedContract.title} - ${milestoneOptions[idx]}`,
                description: `Milestone payment for: ${milestoneOptions[idx]}`,
              }))
            }}
          />
        )}
        <Button className="mt-3" onClick={() => void createInvoice()} disabled={saving || !clientId}>
          {saving ? "Generating..." : "Generate invoice"}
        </Button>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">Invoices</p>
          <Badge variant="secondary">{invoices.length}</Badge>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No invoices generated for this person yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium flex items-center flex-wrap gap-2">
                      {invoice.title}
                      {invoice.installmentIndex !== null && invoice.installmentIndex !== undefined && (
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/25">
                          Milestone {invoice.installmentIndex + 1}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.invoiceNumber} · due {invoice.dueDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{invoice.status}</Badge>
                    <Badge variant="secondary">{formatCurrency(invoice.totalCents)}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input
                    value={invoice.title}
                    onChange={(event) =>
                      setInvoices((current) =>
                        current.map((entry) => entry.id === invoice.id ? { ...entry, title: event.target.value } : entry)
                      )
                    }
                  />
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={invoice.status}
                    onChange={(event) =>
                      setInvoices((current) =>
                        current.map((entry) => entry.id === invoice.id ? { ...entry, status: event.target.value as ClientInvoice["status"] } : entry)
                      )
                    }
                  >
                    {["draft", "client_review", "accepted", "paid", "cancelled"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input
                    value={invoice.billTo.name}
                    onChange={(event) =>
                      setInvoices((current) =>
                        current.map((entry) => entry.id === invoice.id ? { ...entry, billTo: { ...entry.billTo, name: event.target.value } } : entry)
                      )
                    }
                    placeholder="Bill-to name"
                  />
                  <Input
                    value={invoice.billTo.company}
                    onChange={(event) =>
                      setInvoices((current) =>
                        current.map((entry) => entry.id === invoice.id ? { ...entry, billTo: { ...entry.billTo, company: event.target.value } } : entry)
                      )
                    }
                    placeholder="Bill-to company"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void saveInvoice(invoice)}>Save invoice</Button>
                  <Button size="sm" variant="outline" onClick={() => setPreviewInvoice(invoice)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void createCheckoutLink(invoice.id)} disabled={checkoutLoadingId === invoice.id}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {checkoutLoadingId === invoice.id ? "Generating pay link..." : "Generate pay link"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(previewInvoice)} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewInvoice?.title || "Invoice preview"}</DialogTitle>
          </DialogHeader>
          {previewInvoice?.renderedHtml ? (
            <iframe title="Invoice preview" srcDoc={previewInvoice.renderedHtml} className="h-[75vh] w-full rounded-md border" />
          ) : (
            <p className="text-sm text-muted-foreground">Preview unavailable.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
