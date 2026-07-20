"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowDownLeft, ArrowUpRight, Building2, Plus, Receipt, Send } from "lucide-react"

export interface ClientOption {
  id: string
  name: string
  retainerBalanceCents?: number
}

export interface InvoiceOption {
  id: string
  clientId: string
  invoiceNumber: string
  title: string
  totalCents: number
  status: string
}

export interface RetainerTransactionItem {
  id: string
  clientId: string
  clientName?: string
  type: "deposit" | "drawdown"
  amountCents: number
  channel: string
  senderOrPurpose: string
  statementOfPurpose?: string | null
  allocatedTo?: string | null
  createdByName?: string
  createdAt: string
  balanceAfterCents: number
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function RetainerLedgerControl({
  clients,
  invoices = [],
  initialTransactions = [],
}: {
  clients: ClientOption[]
  invoices?: InvoiceOption[]
  initialTransactions?: RetainerTransactionItem[]
}) {
  const [transactions, setTransactions] = useState<RetainerTransactionItem[]>(initialTransactions)
  const [depositOpen, setDepositOpen] = useState(false)
  const [drawdownOpen, setDrawdownOpen] = useState(false)
  const [plaidOpen, setPlaidOpen] = useState(false)
  const [plaidInfo, setPlaidInfo] = useState<{ message?: string; linkToken?: string; isDemo?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlaidConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/plaid/link-token", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.success) {
        setPlaidInfo(data)
        setPlaidOpen(true)
      } else {
        setError(data.error || "Failed to initialize Plaid Open Banking.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting Plaid.")
    } finally {
      setLoading(false)
    }
  }

  // Deposit Form state
  const [depositForm, setDepositForm] = useState({
    clientId: clients[0]?.id || "",
    amountDollars: "",
    channel: "cashapp",
    senderOrPurpose: "",
    matchInvoiceId: "",
  })

  // Drawdown Form state
  const [drawdownForm, setDrawdownForm] = useState({
    clientId: clients[0]?.id || "",
    amountDollars: "",
    statementOfPurpose: "",
    allocatedTo: "nexus",
  })

  const selectedDepositClientInvoices = invoices.filter(
    (inv) => inv.clientId === depositForm.clientId && inv.status !== "paid"
  )

  const handleDepositSubmit = async () => {
    setError(null)
    if (!depositForm.clientId) {
      setError("Please select a client.")
      return
    }
    const dollars = parseFloat(depositForm.amountDollars)
    if (Number.isNaN(dollars) || dollars <= 0) {
      setError("Please enter a valid deposit amount.")
      return
    }
    const amountCents = Math.round(dollars * 100)

    setLoading(true)
    try {
      const res = await fetch("/api/admin/retainer/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: depositForm.clientId,
          type: "deposit",
          amountCents,
          channel: depositForm.channel,
          senderOrPurpose: depositForm.senderOrPurpose || `Payment via ${depositForm.channel}`,
          matchInvoiceId: depositForm.matchInvoiceId || null,
        }),
      })

      const payload = await res.json()
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error || "Failed to record payment deposit.")
      }

      const clientName = clients.find((c) => c.id === depositForm.clientId)?.name
      const newTx: RetainerTransactionItem = {
        ...payload.data,
        clientName,
      }

      setTransactions((prev) => [newTx, ...prev])
      setDepositOpen(false)
      setDepositForm({
        clientId: clients[0]?.id || "",
        amountDollars: "",
        channel: "cashapp",
        senderOrPurpose: "",
        matchInvoiceId: "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error recording deposit.")
    } finally {
      setLoading(false)
    }
  }

  const handleDrawdownSubmit = async () => {
    setError(null)
    if (!drawdownForm.clientId) {
      setError("Please select a client.")
      return
    }
    const dollars = parseFloat(drawdownForm.amountDollars)
    if (Number.isNaN(dollars) || dollars <= 0) {
      setError("Please enter a valid drawdown amount.")
      return
    }
    if (!drawdownForm.statementOfPurpose.trim()) {
      setError("Please enter a Statement of Purpose for this drawdown.")
      return
    }

    const amountCents = Math.round(dollars * 100)
    setLoading(true)

    try {
      const res = await fetch("/api/admin/retainer/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: drawdownForm.clientId,
          type: "drawdown",
          amountCents,
          channel: "retainer_drawdown",
          senderOrPurpose: drawdownForm.statementOfPurpose,
          statementOfPurpose: drawdownForm.statementOfPurpose,
          allocatedTo: drawdownForm.allocatedTo,
        }),
      })

      const payload = await res.json()
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error || "Failed to record retainer drawdown.")
      }

      const clientName = clients.find((c) => c.id === drawdownForm.clientId)?.name
      const newTx: RetainerTransactionItem = {
        ...payload.data,
        clientName,
      }

      setTransactions((prev) => [newTx, ...prev])
      setDrawdownOpen(false)
      setDrawdownForm({
        clientId: clients[0]?.id || "",
        amountDollars: "",
        statementOfPurpose: "",
        allocatedTo: "nexus",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error recording drawdown.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Retainer & Escrow Ledger</h2>
          <p className="text-xs text-muted-foreground">
            Ingest external payments (CashApp, Apple Pay, Zelle) and authorize retainer drawdowns with statements of purpose.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handlePlaidConnect} className="gap-1.5 text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20">
            <Building2 className="h-4 w-4 text-emerald-600" />
            Link CashApp / Bank (Plaid)
          </Button>
          <Button onClick={() => setDepositOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            Log External Payment / CashApp
          </Button>
          <Button variant="outline" onClick={() => setDrawdownOpen(true)} className="gap-1.5 text-xs">
            <Send className="h-4 w-4" />
            Drawdown with Statement of Purpose
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date & Time</th>
                <th className="px-4 py-3 font-medium">Type / Channel</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Statement of Purpose / Memo</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Vault Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-xs">
                    No retainer ledger transactions recorded yet. Click "Log External Payment / CashApp" to deposit payments.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="transition hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {tx.type === "deposit" ? (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 gap-1 text-xs">
                            <ArrowDownLeft className="h-3 w-3" />
                            {tx.channel.toUpperCase()}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-600 gap-1 text-xs">
                            <ArrowUpRight className="h-3 w-3" />
                            DRAWDOWN
                          </Badge>
                        )}
                        {tx.allocatedTo && (
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {tx.allocatedTo}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {tx.clientName || clients.find((c) => c.id === tx.clientId)?.name || tx.clientId}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-md">
                      <p className="font-medium text-foreground">{tx.senderOrPurpose}</p>
                      {tx.statementOfPurpose && tx.statementOfPurpose !== tx.senderOrPurpose && (
                        <p className="italic mt-0.5 text-muted-foreground">"{tx.statementOfPurpose}"</p>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${tx.type === "deposit" ? "text-emerald-600" : "text-orange-600"}`}>
                      {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatCurrency(tx.balanceAfterCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Deposit Payment (CashApp, Apple Pay, Zelle, etc.) */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Log External Payment / CashApp Deposit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs">{error}</div>}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</label>
              <select
                value={depositForm.clientId}
                onChange={(e) => setDepositForm({ ...depositForm, clientId: e.target.value, matchInvoiceId: "" })}
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Channel</label>
                <select
                  value={depositForm.channel}
                  onChange={(e) => setDepositForm({ ...depositForm, channel: e.target.value })}
                  className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="cashapp">CashApp</option>
                  <option value="apple_pay">Apple Pay</option>
                  <option value="zelle">Zelle</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="189.00"
                  value={depositForm.amountDollars}
                  onChange={(e) => setDepositForm({ ...depositForm, amountDollars: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sender / Subject Line Memo</label>
              <Input
                placeholder="e.g. Rick / MKE Black - Web Development"
                value={depositForm.senderOrPurpose}
                onChange={(e) => setDepositForm({ ...depositForm, senderOrPurpose: e.target.value })}
                className="mt-1"
              />
            </div>

            {selectedDepositClientInvoices.length > 0 && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Match & Mark Invoice Paid (Optional)</label>
                <select
                  value={depositForm.matchInvoiceId}
                  onChange={(e) => setDepositForm({ ...depositForm, matchInvoiceId: e.target.value })}
                  className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Do not match (Deposit straight to Retainer Vault)</option>
                  {selectedDepositClientInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.title} ({formatCurrency(inv.totalCents)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDepositOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleDepositSubmit} disabled={loading}>
                {loading ? "Recording Deposit..." : "Confirm Deposit to Retainer Vault"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Drawdown Retainer with Statement of Purpose */}
      <Dialog open={drawdownOpen} onOpenChange={setDrawdownOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-orange-600" />
              Drawdown Retainer with Statement of Purpose
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs">{error}</div>}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</label>
              <select
                value={drawdownForm.clientId}
                onChange={(e) => setDrawdownForm({ ...drawdownForm, clientId: e.target.value })}
                className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drawdown Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="50.00"
                  value={drawdownForm.amountDollars}
                  onChange={(e) => setDrawdownForm({ ...drawdownForm, amountDollars: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Allocation</label>
                <select
                  value={drawdownForm.allocatedTo}
                  onChange={(e) => setDrawdownForm({ ...drawdownForm, allocatedTo: e.target.value })}
                  className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="nexus">Nexus</option>
                  <option value="space">Space</option>
                  <option value="motion">Motion</option>
                  <option value="cohort">Cohort</option>
                  <option value="custom">Custom / Agency Work</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statement of Purpose</label>
              <Textarea
                rows={3}
                placeholder="e.g. ReadyAimGo Nexus Subscription for MKE Black - July 2026 hosting and maintenance"
                value={drawdownForm.statementOfPurpose}
                onChange={(e) => setDrawdownForm({ ...drawdownForm, statementOfPurpose: e.target.value })}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This rationale will be logged in the client's visible Retainer Vault and mirrored across the Client Portal and raCommand.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDrawdownOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleDrawdownSubmit} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                {loading ? "Recording Drawdown..." : "Authorize Drawdown & Log Rationale"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Plaid Open Banking Account Link */}
      <Dialog open={plaidOpen} onOpenChange={setPlaidOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Link CashApp / Bank Account (Plaid Open Banking)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold text-sm">Automated Real-Time Open Banking Sync</p>
              <p className="mt-1 leading-relaxed">
                Connect your CashApp or Lincoln Savings Bank account directly via Plaid Open Banking OAuth (the same secure system used by Microsoft Outlook, QuickBooks, and Mint).
              </p>
            </div>

            {plaidInfo?.message && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 text-xs">
                {plaidInfo.message}
              </div>
            )}

            <div className="space-y-2 rounded border bg-muted/30 p-3">
              <p className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">How Automated Ingestion Works:</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>Sign into CashApp via Plaid's official OAuth authorization window.</li>
                <li>Incoming payments (like Rick's $189 CashApp transfer) trigger real-time webhooks.</li>
                <li>ReadyAimGo automatically matches deposits to client retainers without manual data entry.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlaidOpen(false)}>
                Close
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  alert(`Plaid Link Token: ${plaidInfo?.linkToken || "demo-mode"}. Set PLAID_CLIENT_ID & PLAID_SECRET in .env.local for live production OAuth login.`)
                  setPlaidOpen(false)
                }}
              >
                Launch Plaid OAuth Connection Window
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
