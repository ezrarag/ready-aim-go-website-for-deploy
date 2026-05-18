"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  FolderOpen,
  ListTodo,
  RefreshCw,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { ClientClaimRequestsPanel } from "@/components/admin/client-claim-requests-panel"

type ClientRecord = {
  id: string
  name?: string
  status?: string
  updatedAt?: unknown
  lastActivity?: unknown
}

type ProjectRecord = {
  id: string
  clientId?: string
  workspaceId?: string
  clientPortalEmail?: string
  status?: string
  updatedAt?: unknown
}

type TaskRecord = {
  id: string
  title?: string
  status?: string
  clientId?: string
  workspaceId?: string
  projectId?: string
  updatedAt?: unknown
}

type DashboardState = {
  clients: ClientRecord[]
  projects: ProjectRecord[]
  tasks: TaskRecord[]
  errors: string[]
  lastUpdated: string
}

function emptyDashboardState(): DashboardState {
  return {
    clients: [],
    projects: [],
    tasks: [],
    errors: [],
    lastUpdated: new Date().toISOString(),
  }
}

async function readAdminList<T>(url: string, label: string): Promise<{ data: T[]; error?: string }> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || payload.success === false) {
      return { data: [], error: payload.error || `${label} returned ${response.status}` }
    }

    const data = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.clients)
        ? payload.clients
        : []

    return { data: data as T[] }
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : `Unable to load ${label}`,
    }
  }
}

function timestampLikeToDate(value: unknown): Date | null {
  if (!value || typeof value !== "object") return null
  const timestamp = value as {
    _nanoseconds?: number
    _seconds?: number
    nanoseconds?: number
    seconds?: number
  }
  const seconds = timestamp._seconds ?? timestamp.seconds
  const nanoseconds = timestamp._nanoseconds ?? timestamp.nanoseconds ?? 0
  if (typeof seconds !== "number") return null

  const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000))
  return Number.isNaN(date.getTime()) ? null : date
}

function toTimestampMillis(value?: unknown) {
  if (!value) return 0
  const timestampDate = timestampLikeToDate(value)
  if (timestampDate) return timestampDate.getTime()

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime()
  if (typeof value !== "string" && typeof value !== "number") return 0

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function formatWhen(value?: unknown) {
  if (!value) return "No timestamp"
  const timestampDate = timestampLikeToDate(value)
  if (timestampDate) return timestampDate.toLocaleString()

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "No timestamp" : value.toLocaleString()
  if (typeof value !== "string" && typeof value !== "number") return "No timestamp"

  const text = String(value)
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? text : date.toLocaleString()
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>(emptyDashboardState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboard = async () => {
    setRefreshing(true)
    setLoading(true)

    const [clientsResult, projectsResult, tasksResult] = await Promise.all([
      readAdminList<ClientRecord>("/api/admin/clients?limit=200", "clients"),
      readAdminList<ProjectRecord>("/api/admin/projects?limit=200", "projects"),
      readAdminList<TaskRecord>("/api/admin/tasks?limit=200", "tasks"),
    ])

    setState({
      clients: clientsResult.data,
      projects: projectsResult.data,
      tasks: tasksResult.data,
      errors: [clientsResult.error, projectsResult.error, tasksResult.error].filter(
        (error): error is string => Boolean(error)
      ),
      lastUpdated: new Date().toISOString(),
    })
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void fetchDashboard()
  }, [])

  const openTasks = state.tasks.filter((task) => !["done", "declined"].includes(task.status ?? "")).length
  const activeProjects = state.projects.filter((project) => project.status !== "archived").length
  const projectClientIds = new Set(state.projects.map((project) => project.clientId || project.id).filter(Boolean))
  const portalWarnings = state.clients.filter((client) => !projectClientIds.has(client.id)).length
  const recentClients = useMemo(
    () =>
      [...state.clients]
        .sort((a, b) => {
          const aTime = toTimestampMillis(a.updatedAt) || toTimestampMillis(a.lastActivity)
          const bTime = toTimestampMillis(b.updatedAt) || toTimestampMillis(b.lastActivity)
          return bTime - aTime
        })
        .slice(0, 5),
    [state.clients]
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Lightweight recovery view for clients, projects, tasks, and portal access readiness.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-border/70 bg-card/80"
            onClick={() => void fetchDashboard()}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetricTile
            label="Clients"
            value={loading ? "..." : state.clients.length}
            hint="Records in clients"
            trailing={<Users className="h-5 w-5 text-muted-foreground" />}
          />
          <AdminMetricTile
            label="Projects"
            value={loading ? "..." : activeProjects}
            hint="Shared projects collection"
            trailing={<FolderOpen className="h-5 w-5 text-muted-foreground" />}
          />
          <AdminMetricTile
            label="Open Tasks"
            value={loading ? "..." : openTasks}
            hint="projectTasks not done or declined"
            trailing={<ListTodo className="h-5 w-5 text-muted-foreground" />}
          />
          <AdminMetricTile
            label="Portal Warnings"
            value={loading ? "..." : portalWarnings}
            hint="Clients without a linked portal project"
            trailing={<AlertTriangle className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {state.errors.length > 0 ? (
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Load Warnings
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {state.errors.map((error) => (
                <div key={error} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                  {error}
                </div>
              ))}
            </CardContent>
          </AdminPanel>
        ) : null}

        <ClientClaimRequestsPanel />

        <div className="grid gap-6 xl:grid-cols-2">
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle>Primary Work Areas</AdminPanelTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                ["Clients", "/dashboard/clients", "Directory, portal access, and public profile controls."],
                ["Portal Requests", "/dashboard/clients/access", "Approve client portal workspace claims."],
                ["Projects", "/dashboard/web-development", "Project records and delivery visibility."],
                ["Files", "/dashboard/clients/assets", "Client-owned assets, story media, and links."],
                ["Tasks", "/dashboard/command", "Command center and task queues."],
              ].map(([label, href, description]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{label}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </Link>
              ))}
            </CardContent>
          </AdminPanel>

          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle>Recent Client Activity</AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading client records...</p>
              ) : recentClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No client records loaded yet.</p>
              ) : (
                recentClients.map((client) => (
                  <AdminPanelInset key={client.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{client.name || client.id}</p>
                      <p className="text-xs text-muted-foreground">{formatWhen(client.updatedAt || client.lastActivity)}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/clients/${encodeURIComponent(client.id)}`}>Open</Link>
                    </Button>
                  </AdminPanelInset>
                ))
              )}
              <p className="text-xs text-muted-foreground">
                Last refreshed {new Date(state.lastUpdated).toLocaleString()}
              </p>
            </CardContent>
          </AdminPanel>
        </div>
      </div>
    </DashboardLayout>
  )
}
