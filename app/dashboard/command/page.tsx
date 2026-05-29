"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ListTodo, RefreshCw, Search, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import {
  formatAdminDate,
  formatAdminDateTime,
  isTaskBlocked,
  isTaskOpen,
  normalizeAdminClientRecord,
  normalizeAdminProjectRecord,
  normalizeAdminTaskRecord,
  sortByUpdatedDesc,
  type AdminClientRecord,
  type AdminProjectRecord,
  type AdminTaskRecord,
  type AdminTaskStatus,
} from "@/lib/admin/ops-data"

type CommandState = {
  clients: AdminClientRecord[]
  projects: AdminProjectRecord[]
  tasks: AdminTaskRecord[]
  errors: string[]
}

const emptyState: CommandState = {
  clients: [],
  projects: [],
  tasks: [],
  errors: [],
}

async function readAdminArray(url: string, label: string): Promise<{ records: unknown[]; error?: string }> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload?.success === false) {
      return { records: [], error: payload?.error || `${label} returned ${response.status}` }
    }
    const records = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.clients) ? payload.clients : []
    return { records }
  } catch (error) {
    return { records: [], error: error instanceof Error ? error.message : `Unable to load ${label}` }
  }
}

function statusLabel(status: AdminTaskStatus) {
  return status.replace("_", " ")
}

function statusClass(status: AdminTaskStatus) {
  if (status === "done") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (status === "blocked") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
  if (status === "in_progress" || status === "accepted") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  if (status === "declined") return "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300"
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function taskMatches(task: AdminTaskRecord, search: string) {
  if (!search) return true
  return [task.title, task.summary, task.blocker, task.clientId, task.clientName, task.workspaceId, task.projectId, task.owner]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search.toLowerCase())
}

export default function CommandCenterPage() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<CommandState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "open")
  const selectedProjectId = searchParams.get("projectId")

  const loadCommand = async () => {
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
    })
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void loadCommand()
  }, [])

  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "open")
  }, [searchParams])

  const clientById = useMemo(() => new Map(state.clients.map((client) => [client.id, client])), [state.clients])
  const projectById = useMemo(() => new Map(state.projects.map((project) => [project.id, project])), [state.projects])
  const openTasks = useMemo(() => state.tasks.filter(isTaskOpen), [state.tasks])
  const blockedTasks = useMemo(() => openTasks.filter(isTaskBlocked), [openTasks])
  const visibleTasks = useMemo(() => {
    return sortByUpdatedDesc(state.tasks)
      .filter((task) => !selectedProjectId || task.projectId === selectedProjectId)
      .filter((task) => {
        if (statusFilter === "all") return true
        if (statusFilter === "open") return isTaskOpen(task)
        if (statusFilter === "blocked") return isTaskBlocked(task)
        return task.status === statusFilter
      })
      .filter((task) => taskMatches(task, search))
  }, [state.tasks, selectedProjectId, statusFilter, search])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Ops Console</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground">
              Command queue for project tasks, blockers, client follow-up, and delivery triage.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadCommand()} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile label="Open Tasks" value={loading ? "..." : openTasks.length} trailing={<ListTodo className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Blocked" value={loading ? "..." : blockedTasks.length} hint="Needs intervention" trailing={<ShieldAlert className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Completed" value={loading ? "..." : state.tasks.filter((task) => task.status === "done").length} trailing={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Projects With Tasks" value={loading ? "..." : new Set(state.tasks.map((task) => task.projectId).filter(Boolean)).size} trailing={<Clock className="h-5 w-5 text-muted-foreground" />} />
        </div>

        {state.errors.length > 0 ? (
          <AdminPanel>
            <CardContent className="space-y-2 p-4">
              {state.errors.map((error) => (
                <div key={error} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                  {error}
                </div>
              ))}
            </CardContent>
          </AdminPanel>
        ) : null}

        <AdminPanel>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tasks, blockers, clients, owners..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["open", "blocked", "proposed", "accepted", "in_progress", "done", "all"].map((status) => (
                  <Button key={status} variant={statusFilter === status ? "default" : "outline"} onClick={() => setStatusFilter(status)}>
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </AdminPanel>

        <div className="grid gap-4 xl:grid-cols-2">
          {visibleTasks.length === 0 ? (
            <AdminPanel className="xl:col-span-2">
              <CardContent className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
                {loading ? "Loading tasks..." : "No tasks match this view."}
              </CardContent>
            </AdminPanel>
          ) : (
            visibleTasks.map((task) => {
              const project = task.projectId ? projectById.get(task.projectId) : null
              const client = task.clientId ? clientById.get(task.clientId) : project?.clientId ? clientById.get(project.clientId) : null
              return (
                <AdminPanel key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <AdminPanelTitle className="truncate text-lg">{task.title}</AdminPanelTitle>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {client?.name || task.clientName || project?.clientName || task.clientId || "No client linked"}
                        </p>
                      </div>
                      <Badge className={statusClass(task.status)}>{statusLabel(task.status)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {task.blocker ? (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
                        <div className="flex items-center gap-2 font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          Blocker
                        </div>
                        <p className="mt-1">{task.blocker}</p>
                      </div>
                    ) : task.summary ? (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{task.summary}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No task summary recorded.</p>
                    )}
                    <div className="grid gap-3 md:grid-cols-3">
                      <AdminPanelInset className="p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Project</p>
                        <p className="mt-2 truncate text-sm text-foreground">{project?.name || task.projectId || "Missing"}</p>
                      </AdminPanelInset>
                      <AdminPanelInset className="p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Owner</p>
                        <p className="mt-2 truncate text-sm text-foreground">{task.owner || "Unassigned"}</p>
                      </AdminPanelInset>
                      <AdminPanelInset className="p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
                        <p className="mt-2 text-sm text-foreground">{formatAdminDate(task.updatedAt || task.createdAt)}</p>
                      </AdminPanelInset>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {client ? (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/clients/${encodeURIComponent(client.id)}`}>
                            Open Client
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                      {project ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/web-development?clientId=${encodeURIComponent(project.clientId || "")}`}>Project Board</Link>
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">Last update {formatAdminDateTime(task.updatedAt || task.createdAt)}</p>
                  </CardContent>
                </AdminPanel>
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
