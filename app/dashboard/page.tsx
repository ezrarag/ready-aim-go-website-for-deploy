"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  RefreshCw,
  Users,
  UserRoundCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import {
  buildAdminActivity,
  computeAdminOpsMetrics,
  formatAdminDateTime,
  getRelationshipHealth,
  isPortalPersonRecord,
  isRelationshipRecord,
  isTaskBlocked,
  isTaskOpen,
  normalizeAdminClientRecord,
  normalizeAdminProjectRecord,
  normalizeAdminTaskRecord,
  sortByUpdatedDesc,
  type AdminActivityRecord,
  type AdminClientRecord,
  type AdminProjectRecord,
  type AdminTaskRecord,
} from "@/lib/admin/ops-data"

type LoadState = {
  clients: AdminClientRecord[]
  projects: AdminProjectRecord[]
  tasks: AdminTaskRecord[]
  errors: string[]
  loadedAt: string | null
}

const emptyState: LoadState = {
  clients: [],
  projects: [],
  tasks: [],
  errors: [],
  loadedAt: null,
}

async function readAdminArray(url: string, label: string): Promise<{ records: unknown[]; error?: string }> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload?.success === false) {
      return { records: [], error: payload?.error || `${label} returned ${response.status}` }
    }
    const records = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.clients)
        ? payload.clients
        : Array.isArray(payload.tasks)
          ? payload.tasks
          : []
    return { records }
  } catch (error) {
    return { records: [], error: error instanceof Error ? error.message : `Unable to load ${label}` }
  }
}

function healthClass(tone: "good" | "warning" | "setup") {
  if (tone === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (tone === "setup") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function activityClass(tone: AdminActivityRecord["tone"]) {
  if (tone === "danger") return "border-red-500/30 bg-red-500/10"
  if (tone === "warning") return "border-amber-500/30 bg-amber-500/10"
  if (tone === "success") return "border-emerald-500/30 bg-emerald-500/10"
  return "border-border/70 bg-card/70"
}

export default function DashboardPage() {
  const [state, setState] = useState<LoadState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = async () => {
    setLoading(true)
    setRefreshing(true)
    const [clientsResult, projectsResult, tasksResult] = await Promise.all([
      readAdminArray("/api/admin/clients?includePeople=true&limit=200", "clients"),
      readAdminArray("/api/admin/projects?limit=200", "projects"),
      readAdminArray("/api/admin/tasks?limit=200", "tasks"),
    ])

    setState({
      clients: clientsResult.records.map(normalizeAdminClientRecord),
      projects: projectsResult.records.map(normalizeAdminProjectRecord),
      tasks: tasksResult.records.map(normalizeAdminTaskRecord),
      errors: [clientsResult.error, projectsResult.error, tasksResult.error].filter((error): error is string => Boolean(error)),
      loadedAt: new Date().toISOString(),
    })
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  const relationships = useMemo(() => state.clients.filter(isRelationshipRecord), [state.clients])
  const portalPeople = useMemo(() => state.clients.filter(isPortalPersonRecord), [state.clients])
  const needsAssignment = useMemo(
    () => portalPeople.filter((person) => person.adminApprovalPending || !person.assignedClientId),
    [portalPeople]
  )
  const openTasks = useMemo(() => state.tasks.filter(isTaskOpen), [state.tasks])
  const blockedTasks = useMemo(() => openTasks.filter(isTaskBlocked), [openTasks])
  const metrics = useMemo(
    () => computeAdminOpsMetrics({ clients: state.clients, projects: state.projects, tasks: state.tasks, warnings: state.errors.length }),
    [state]
  )
  const recentActivity = useMemo(
    () => buildAdminActivity({ clients: state.clients, projects: state.projects, tasks: state.tasks }).slice(0, 8),
    [state]
  )
  const relationshipHealth = useMemo(
    () =>
      sortByUpdatedDesc(relationships)
        .slice(0, 6)
        .map((client) => ({ client, health: getRelationshipHealth(client, state.projects) })),
    [relationships, state.projects]
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">ReadyAimGo Ops Console</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Clients, portal people, projects, tasks, and operational warnings in one stable view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadDashboard()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/clients">
                Open Clients
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile label="Relationships" value={loading ? "..." : metrics.relationships} hint={`${metrics.staleRelationships} need follow-up`} trailing={<Users className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Portal People" value={loading ? "..." : metrics.portalPeople} hint={`${metrics.needsAssignment} need assignment`} trailing={<UserRoundCheck className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Active Projects" value={loading ? "..." : metrics.activeProjects} hint="Non-archived project records" trailing={<FolderKanban className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Open Tasks" value={loading ? "..." : metrics.openTasks} hint={`${metrics.blockedTasks} blocked`} trailing={<ListTodo className="h-5 w-5 text-muted-foreground" />} />
        </div>

        {state.errors.length > 0 ? (
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                System Warnings
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {state.errors.map((error) => (
                <div key={error} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                  {error}
                </div>
              ))}
            </CardContent>
          </AdminPanel>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle>Needs Attention</AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Portal assignment queue</h2>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/clients?view=people">Review</Link>
                  </Button>
                </div>
                <div className="space-y-2">
                  {needsAssignment.length === 0 ? (
                    <AdminPanelInset className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      No unassigned portal people.
                    </AdminPanelInset>
                  ) : (
                    needsAssignment.slice(0, 4).map((person) => (
                      <AdminPanelInset key={person.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{person.name}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">{person.clientPortalEmail || person.contactEmail || person.id}</p>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </AdminPanelInset>
                    ))
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Blocked tasks</h2>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/command?status=blocked">Open Tasks</Link>
                  </Button>
                </div>
                <div className="space-y-2">
                  {blockedTasks.length === 0 ? (
                    <AdminPanelInset className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      No blocked tasks.
                    </AdminPanelInset>
                  ) : (
                    blockedTasks.slice(0, 4).map((task) => (
                      <AdminPanelInset key={task.id} className="p-3">
                        <p className="font-medium text-foreground">{task.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{task.blocker || task.summary || "Blocked"}</p>
                      </AdminPanelInset>
                    ))
                  )}
                </div>
              </section>
            </CardContent>
          </AdminPanel>

          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle>Relationship Health</AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {relationshipHealth.length === 0 ? (
                <p className="text-sm text-muted-foreground">No relationships loaded.</p>
              ) : (
                relationshipHealth.map(({ client, health }) => (
                  <Link key={client.id} href={`/dashboard/clients/${encodeURIComponent(client.id)}`} className="block">
                    <AdminPanelInset className="flex items-center justify-between gap-3 p-3 transition hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{client.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{client.storyId}</p>
                      </div>
                      <Badge className={healthClass(health.tone)}>{health.label}</Badge>
                    </AdminPanelInset>
                  </Link>
                ))
              )}
            </CardContent>
          </AdminPanel>
        </div>

        <AdminPanel>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <AdminPanelTitle>Recent Activity</AdminPanelTitle>
              <span className="text-xs text-muted-foreground">
                Last loaded {state.loadedAt ? formatAdminDateTime(state.loadedAt) : "never"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity found.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {recentActivity.map((item) => {
                  const content = (
                    <div className={`rounded-xl border p-4 ${activityClass(item.tone)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
                        </div>
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{formatAdminDateTime(item.at)}</p>
                    </div>
                  )
                  return item.href ? <Link key={item.id} href={item.href}>{content}</Link> : <div key={item.id}>{content}</div>
                })}
              </div>
            )}
          </CardContent>
        </AdminPanel>
      </div>
    </DashboardLayout>
  )
}
