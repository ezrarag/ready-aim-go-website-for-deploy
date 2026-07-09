"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  ListTodo,
  RefreshCw,
  Users,
} from "lucide-react"

import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { getAdminHubHref } from "@/lib/admin-navigation"
import type { AdminHubPayload, AdminHubTask } from "@/lib/admin/ops-hub"

type AdminOpsState = AdminHubPayload["data"] & {
  error: string | null
}

const EMPTY_STATE: AdminOpsState = {
  clients: [],
  people: [],
  workspaces: [],
  projects: [],
  tasks: [],
  warnings: [],
  loadedAt: "",
  error: null,
}

function isOpenTask(task: AdminHubTask) {
  return task.status !== "done" && task.status !== "declined" && task.status !== "cancelled"
}

function isBlockedTask(task: AdminHubTask) {
  return task.status === "blocked" || Boolean(task.blocker)
}

function formatLoadedAt(value: string) {
  if (!value) return "Not loaded yet"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function OperationsSnapshotCard() {
  const [state, setState] = useState<AdminOpsState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (mode: "initial" | "refresh") => {
    if (mode === "refresh") setRefreshing(true)
    if (mode === "initial") setLoading(true)

    try {
      const response = await fetch("/api/admin/ops", { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error || "Unable to load operations snapshot")
      }
      setState({ ...payload.data, error: null })
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to load operations snapshot",
      }))
    } finally {
      if (mode === "refresh") setRefreshing(false)
      if (mode === "initial") setLoading(false)
    }
  }

  useEffect(() => {
    void load("initial")
  }, [])

  const openTasks = useMemo(() => state.tasks.filter(isOpenTask), [state.tasks])
  const blockedTasks = useMemo(() => openTasks.filter(isBlockedTask), [openTasks])
  const unassignedPeople = useMemo(
    () => state.people.filter((person) => person.status === "pending" || person.clientIds.length === 0),
    [state.people]
  )
  const activeSubscriptions = useMemo(
    () =>
      state.clients.reduce(
        (count, client) =>
          count +
          Object.values(client.subscriptions).filter((subscription) =>
            subscription.status === "active" || subscription.status === "trialing"
          ).length,
        0
      ),
    [state.clients]
  )

  return (
    <div className="space-y-6">
      <AdminPanel>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Snapshot
            </p>
            <AdminPanelTitle className="mt-2">Operations snapshot</AdminPanelTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Aggregate health across people, workspaces, task pressure, subscriptions, and admin warnings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{loading ? "Loading..." : formatLoadedAt(state.loadedAt)}</Badge>
            <Button variant="outline" size="sm" onClick={() => void load("refresh")} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <AdminMetricTile label="Relationships" value={loading ? "..." : state.clients.length} trailing={<Building2 className="h-5 w-5 text-muted-foreground" />} />
            <AdminMetricTile label="People" value={loading ? "..." : state.people.length} hint={`${unassignedPeople.length} pending`} trailing={<Users className="h-5 w-5 text-muted-foreground" />} />
            <AdminMetricTile label="Workspaces" value={loading ? "..." : state.workspaces.length} trailing={<BriefcaseBusiness className="h-5 w-5 text-muted-foreground" />} />
            <AdminMetricTile label="Open work" value={loading ? "..." : openTasks.length} hint={`${blockedTasks.length} blocked`} trailing={<ListTodo className="h-5 w-5 text-muted-foreground" />} />
            <AdminMetricTile label="Subscriptions" value={loading ? "..." : activeSubscriptions} hint="Active product lines" trailing={<CircleDollarSign className="h-5 w-5 text-muted-foreground" />} />
            <AdminMetricTile label="Warnings" value={loading ? "..." : state.warnings.length} trailing={<AlertTriangle className="h-5 w-5 text-muted-foreground" />} />
          </div>

          {state.error ? (
            <AdminPanelInset className="border-red-500/30 bg-red-500/5 text-sm text-red-700 dark:text-red-300">
              {state.error}
            </AdminPanelInset>
          ) : null}
        </CardContent>
      </AdminPanel>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Warnings</AdminPanelTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <AdminPanelInset className="text-sm text-muted-foreground">Loading warnings...</AdminPanelInset>
          ) : state.warnings.length === 0 ? (
            <AdminPanelInset className="text-sm text-muted-foreground">No warnings right now.</AdminPanelInset>
          ) : (
            state.warnings.map((warning) => (
              <AdminPanelInset key={warning.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={warning.severity === "danger" ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
                      {warning.severity}
                    </Badge>
                    <p className="font-medium text-foreground">{warning.label}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{warning.detail}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={getAdminHubHref(warning.view)}>Open</Link>
                </Button>
              </AdminPanelInset>
            ))
          )}
        </CardContent>
      </AdminPanel>
    </div>
  )
}
