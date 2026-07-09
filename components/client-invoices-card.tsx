"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, Eye, Loader2 } from "lucide-react"

import { portalFetch } from "@/lib/portal-client"
import type { ClientInvoice } from "@/lib/types/client-invoices"
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

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No date"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function ClientInvoicesCard() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<ClientInvoice | null>(null)

  const loadInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await portalFetch("/api/portal/invoices", { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Invoice load returned ${response.status}`)
      }
      setInvoices(Array.isArray(payload.data) ? (payload.data as ClientInvoice[]) : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load invoices.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInvoices()
  }, [])

  const patchInvoice = async (invoice: ClientInvoice, extraBody?: Record<string, unknown>) => {
    setSavingId(invoice.id)
    setError(null)
    try {
      const response = await portalFetch(`/api/portal/invoices/${encodeURIComponent(invoice.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          billTo: invoice.billTo,
          ...extraBody,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true || !payload?.data) {
        throw new Error(payload?.error || `Invoice save returned ${response.status}`)
      }
      const nextInvoice = payload.data as ClientInvoice
      setInvoices((current) => current.map((entry) => (entry.id === nextInvoice.id ? nextInvoice : entry)))
      if (previewInvoice?.id === nextInvoice.id) setPreviewInvoice(nextInvoice)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save invoice.")
    } finally {
      setSavingId(null)
    }
  }

  const openCheckout = async (invoice: ClientInvoice) => {
    setCheckoutId(invoice.id)
    setError(null)
    try {
      const response = await portalFetch(`/api/portal/invoices/${encodeURIComponent(invoice.id)}/checkout`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Checkout creation returned ${response.status}`)
      }
      if (payload.data?.invoice) {
        const nextInvoice = payload.data.invoice as ClientInvoice
        setInvoices((current) => current.map((entry) => (entry.id === nextInvoice.id ? nextInvoice : entry)))
        if (previewInvoice?.id === nextInvoice.id) setPreviewInvoice(nextInvoice)
      }
      if (payload.data?.url) {
        window.open(payload.data.url as string, "_blank", "noopener,noreferrer")
      }
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to open checkout.")
    } finally {
      setCheckoutId(null)
    }
  }

  return (
    <Card className="bg-neutral-800 border-gray-200 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">
            INVOICES
          </CardTitle>
          <p className="mt-2 text-sm text-neutral-400">
            Review, update bill-to details, accept, and pay invoice templates generated from your workspace agreements.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadInvoices()} disabled={loading || Boolean(savingId) || Boolean(checkoutId)}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No invoices are linked to your account yet.
          </p>
        ) : (
          invoices.map((invoice) => {
            const isAccepted = invoice.status === "accepted" || invoice.status === "paid"
            const isLocked = invoice.status === "paid" || invoice.status === "cancelled"
            return (
              <div key={invoice.id} className="rounded-lg border border-gray-200 bg-neutral-900/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-mono text-white">{invoice.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {invoice.invoiceNumber} · Due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{invoice.status}</Badge>
                    <Badge className="bg-orange-500/15 text-orange-300">{formatCurrency(invoice.totalCents)}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input
                    value={invoice.billTo.name}
                    onChange={(event) =>
                      setInvoices((current) =>
                        current.map((entry) =>
                          entry.id === invoice.id
                            ? { ...entry, billTo: { ...entry.billTo, name: event.target.value } }
                            : entry
                        )
                      )
                    }
                    disabled={isLocked}
                    className="bg-neutral-950 border-gray-200 text-white"
                    placeholder="Bill-to name"
                  />
                  <Input
                    value={invoice.billTo.company}
                    onChange={(event) =>
                      setInvoices((current) =>
                        current.map((entry) =>
                          entry.id === invoice.id
                            ? { ...entry, billTo: { ...entry.billTo, company: event.target.value } }
                            : entry
                        )
                      )
                    }
                    disabled={isLocked}
                    className="bg-neutral-950 border-gray-200 text-white"
                    placeholder="Bill-to company"
                  />
                  <Input
                    value={invoice.billTo.email}
                    onChange={(event) =>
                      setInvoices((current) =>
                        current.map((entry) =>
                          entry.id === invoice.id
                            ? { ...entry, billTo: { ...entry.billTo, email: event.target.value } }
                            : entry
                        )
                      )
                    }
                    disabled={isLocked}
                    className="bg-neutral-950 border-gray-200 text-white"
                    placeholder="Bill-to email"
                  />
                  <Input
                    value={invoice.billTo.address}
                    onChange={(event) =>
                      setInvoices((current) =>
                        current.map((entry) =>
                          entry.id === invoice.id
                            ? { ...entry, billTo: { ...entry.billTo, address: event.target.value } }
                            : entry
                        )
                      )
                    }
                    disabled={isLocked}
                    className="bg-neutral-950 border-gray-200 text-white"
                    placeholder="Bill-to address"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void patchInvoice(invoice)}
                    disabled={isLocked || savingId === invoice.id}
                  >
                    {savingId === invoice.id ? "Saving..." : "Save details"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPreviewInvoice(invoice)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void patchInvoice(invoice, { accept: true })}
                    disabled={isLocked || isAccepted || savingId === invoice.id}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isAccepted ? "Accepted" : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void openCheckout(invoice)}
                    disabled={invoice.status === "cancelled" || invoice.status === "draft" || checkoutId === invoice.id}
                    className="bg-orange-500 text-white hover:bg-orange-600"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {checkoutId === invoice.id ? "Opening..." : "Pay"}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>

      <Dialog open={Boolean(previewInvoice)} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-w-5xl bg-white">
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
    </Card>
  )
}
