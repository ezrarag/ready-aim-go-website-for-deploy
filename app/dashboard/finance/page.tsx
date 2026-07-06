import type { Metadata } from "next"

import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { CardContent, CardHeader } from "@/components/ui/card"
import { CircleDollarSign, HandCoins, PiggyBank, Wallet } from "lucide-react"
import { getAllClientDirectoryEntries, getFirestoreDb } from "@/lib/firestore"
import {
  TFH_POOL_ID,
  formatWalletDate,
  isTFHClientCandidate,
  normalizeWalletAllocation,
  normalizeWalletContribution,
  normalizeWalletPool,
  type WalletAllocation,
  type WalletContribution,
  type WalletPool,
} from "@/lib/wallet-pools"

export const metadata: Metadata = {
  title: "Finance | ReadyAimGo",
  description: "Retainer ledger overview for pooled client wallet commitments and allocations.",
}

function formatCurrency(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No date"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

function isInCurrentMonth(value: string | null | undefined) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth()
}

async function ensureTFHPoolIfEligible() {
  const db = getFirestoreDb()
  if (!db) return

  const clients = await getAllClientDirectoryEntries()
  const tfhClient = clients.find((client) => isTFHClientCandidate(client))
  if (!tfhClient?.retainer) return

  const poolRef = db.collection("walletPools").doc(TFH_POOL_ID)
  const snapshot = await poolRef.get()
  if (snapshot.exists) return

  const now = new Date().toISOString()
  await poolRef.set({
    name: "TFH Pool",
    currency: tfhClient.retainer.currency,
    active: true,
    notes: "Canonical pooled wallet for the paid TFH $3K retainer.",
    createdAt: now,
    updatedAt: now,
  })
}

async function loadLedgerData() {
  const db = getFirestoreDb()
  if (!db) {
    return {
      clients: [],
      pools: [] as WalletPool[],
      contributions: [] as WalletContribution[],
      allocations: [] as WalletAllocation[],
      error: "Firebase Admin is not configured.",
    }
  }

  await ensureTFHPoolIfEligible()

  const [clients, poolsSnap] = await Promise.all([
    getAllClientDirectoryEntries(),
    db.collection("walletPools").get(),
  ])

  const pools = poolsSnap.docs.map((doc) =>
    normalizeWalletPool(doc.id, doc.data() as Record<string, unknown>)
  )

  const contributionSnaps = await Promise.all(
    pools.map((pool) => db.collection("walletPools").doc(pool.id).collection("contributions").get())
  )
  const allocationSnaps = await Promise.all(
    pools.map((pool) => db.collection("walletPools").doc(pool.id).collection("allocations").get())
  )

  const contributions = contributionSnaps.flatMap((snapshot) =>
    snapshot.docs.map((doc) =>
      normalizeWalletContribution(doc.id, doc.data() as Record<string, unknown>)
    )
  )
  const allocations = allocationSnaps.flatMap((snapshot) =>
    snapshot.docs.map((doc) =>
      normalizeWalletAllocation(doc.id, doc.data() as Record<string, unknown>)
    )
  )

  return { clients, pools, contributions, allocations, error: null as string | null }
}

export default async function FinancePage() {
  const { clients, pools, contributions, allocations, error } = await loadLedgerData()

  const activeRetainers = clients.filter((client) => client.retainer?.active)
  const totalCommitted = activeRetainers.reduce(
    (sum, client) => sum + (client.retainer?.amountTotal ?? 0),
    0
  )
  const totalReceived = contributions.reduce((sum, entry) => sum + entry.amount, 0)
  const totalAllocated = allocations.reduce((sum, entry) => sum + entry.amount, 0)
  const allocatedThisMonth = allocations
    .filter((entry) => isInCurrentMonth(entry.allocatedAt))
    .reduce((sum, entry) => sum + entry.amount, 0)
  const unallocatedBalance = totalReceived - totalAllocated

  const clientsById = new Map(clients.map((client) => [client.id, client]))
  const contributionRows = [...contributions].sort((left, right) => {
    const leftTime = left.receivedAt ? new Date(left.receivedAt).getTime() : 0
    const rightTime = right.receivedAt ? new Date(right.receivedAt).getTime() : 0
    return rightTime - leftTime
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            ReadyAimGo Finance
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Retainer Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Pool commitments on client records, with received contributions and allocations tracked in wallet pools.
          </p>
        </div>

        {error ? (
          <AdminPanel>
            <CardContent className="p-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </CardContent>
          </AdminPanel>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile
            label="Total committed"
            value={formatCurrency(totalCommitted)}
            hint={`${activeRetainers.length} active retainer${activeRetainers.length === 1 ? "" : "s"}`}
            trailing={<CircleDollarSign className="h-8 w-8 text-muted-foreground" />}
          />
          <AdminMetricTile
            label="Total received"
            value={formatCurrency(totalReceived)}
            hint={`${contributions.length} contribution${contributions.length === 1 ? "" : "s"}`}
            trailing={<HandCoins className="h-8 w-8 text-muted-foreground" />}
          />
          <AdminMetricTile
            label="Unallocated balance"
            value={formatCurrency(unallocatedBalance)}
            hint={`${pools.length} pool${pools.length === 1 ? "" : "s"} tracked`}
            trailing={<Wallet className="h-8 w-8 text-muted-foreground" />}
          />
          <AdminMetricTile
            label="Allocated this month"
            value={formatCurrency(allocatedThisMonth)}
            hint={`${allocations.length} allocation${allocations.length === 1 ? "" : "s"} total`}
            trailing={<PiggyBank className="h-8 w-8 text-muted-foreground" />}
          />
        </div>

        <AdminPanel className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <AdminPanelTitle>Contributions by client</AdminPanelTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Wallet pool receipts only. Existing subscription fields remain separate.
              </p>
            </div>
            <Badge variant="outline">{pools.length} active pool record{pools.length === 1 ? "" : "s"}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {contributionRows.length === 0 ? (
              <div className="p-4">
                <AdminPanelInset className="text-sm text-muted-foreground">
                  No contributions recorded yet. The ledger layer is in place; once real paid retainers are written into wallet pools, they will appear here.
                </AdminPanelInset>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-sm">
                  <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Pool</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributionRows.map((entry) => {
                      const client = clientsById.get(entry.clientId)
                      const pool = pools.find((candidate) => candidate.id === entry.poolId)
                      const receivedAt = formatDate(formatWalletDate(entry.receivedAt))

                      return (
                        <tr key={`${entry.poolId}-${entry.id}`} className="border-b border-border transition hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">
                              {entry.clientName || client?.name || entry.clientId}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {client?.storyId || entry.clientId}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {pool?.name || entry.poolId}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{receivedAt}</td>
                          <td className="px-4 py-3 font-medium text-foreground">
                            {formatCurrency(entry.amount, entry.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{entry.source}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {entry.note || entry.invoiceId || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </AdminPanel>
      </div>
    </DashboardLayout>
  )
}
