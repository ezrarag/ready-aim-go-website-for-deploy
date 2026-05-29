"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, AppWindow, ArrowRight, FolderKanban, GitBranch, Globe, RefreshCw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import {
  isRelationshipRecord,
  normalizeAdminClientRecord,
  normalizeAdminProjectRecord,
  normalizeAdminTaskRecord,
  sortByUpdatedDesc,
  type AdminClientRecord,
  type AdminProjectRecord,
  type AdminTaskRecord,
} from "@/lib/admin/ops-data"

type ProjectsState = {
  clients: AdminClientRecord[]
  projects: AdminProjectRecord[]
  tasks: AdminTaskRecord[]
  errors: string[]
}

const emptyState: ProjectsState = {
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

function statusClass(status: string) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (status === "archived") return "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300"
  return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
}

function projectMatches(project: AdminProjectRecord, search: string) {
  if (!search) return true
  return [
    project.name,
    project.clientId,
    project.clientName,
    project.workspaceId,
    project.clientPortalEmail,
    project.githubRepo,
    ...project.githubRepos,
    ...project.repositoryChains,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search.toLowerCase())
}

export default function WebDevelopmentPage() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<ProjectsState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const selectedClientId = searchParams.get("clientId")

  const loadProjects = async () => {
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
    void loadProjects()
  }, [])

  const relationships = useMemo(() => state.clients.filter(isRelationshipRecord), [state.clients])
  const clientById = useMemo(() => new Map(relationships.map((client) => [client.id, client])), [relationships])
  const activeProjects = useMemo(() => state.projects.filter((project) => project.status !== "archived"), [state.projects])
  const unmappedProjects = useMemo(() => activeProjects.filter((project) => !project.clientId || !clientById.has(project.clientId)), [activeProjects, clientById])
  const projectTaskCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of state.tasks) {
      if (!task.projectId) continue
      counts.set(task.projectId, (counts.get(task.projectId) ?? 0) + 1)
    }
    return counts
  }, [state.tasks])
  const visibleProjects = useMemo(() => {
    return sortByUpdatedDesc(state.projects)
      .filter((project) => !selectedClientId || project.clientId === selectedClientId)
      .filter((project) => statusFilter === "all" || project.status === statusFilter)
      .filter((project) => projectMatches(project, search))
  }, [state.projects, selectedClientId, statusFilter, search])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Ops Console</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">
              Project delivery, client linkage, repositories, and task coverage.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadProjects()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/clients/vercel-sync">Vercel Sync</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/web-development/app-store-sync">App Store Sync</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile label="Active Projects" value={loading ? "..." : activeProjects.length} trailing={<FolderKanban className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Unmapped" value={loading ? "..." : unmappedProjects.length} hint="Missing client linkage" trailing={<AlertTriangle className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Repos" value={loading ? "..." : activeProjects.filter((project) => project.githubRepo || project.githubRepos.length > 0).length} trailing={<GitBranch className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Client Coverage" value={loading ? "..." : new Set(activeProjects.map((project) => project.clientId).filter(Boolean)).size} hint={`${relationships.length} relationships`} trailing={<Globe className="h-5 w-5 text-muted-foreground" />} />
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
                  placeholder="Search project, client, repo, workspace..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "active", "archived", "building"].map((status) => (
                  <Button key={status} variant={statusFilter === status ? "default" : "outline"} onClick={() => setStatusFilter(status)}>
                    {status === "all" ? "All" : status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </AdminPanel>

        <div className="grid gap-4 lg:grid-cols-2">
          {visibleProjects.length === 0 ? (
            <AdminPanel className="lg:col-span-2">
              <CardContent className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
                {loading ? "Loading projects..." : "No projects match this view."}
              </CardContent>
            </AdminPanel>
          ) : (
            visibleProjects.map((project) => {
              const client = project.clientId ? clientById.get(project.clientId) : null
              const taskCount = projectTaskCounts.get(project.id) ?? 0
              return (
                <AdminPanel key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <AdminPanelTitle className="truncate text-lg">{project.name}</AdminPanelTitle>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{client?.name || project.clientName || project.clientId || "No client linked"}</p>
                      </div>
                      <Badge className={statusClass(project.status)}>{project.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <AdminPanelInset className="p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                        <p className="mt-2 truncate text-sm text-foreground">{project.workspaceId || "Missing"}</p>
                      </AdminPanelInset>
                      <AdminPanelInset className="p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tasks</p>
                        <p className="mt-2 text-sm text-foreground">{taskCount}</p>
                      </AdminPanelInset>
                      <AdminPanelInset className="p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Repo</p>
                        <p className="mt-2 truncate text-sm text-foreground">{project.githubRepo || project.githubRepos[0] || project.repositoryChains[0] || "Missing"}</p>
                      </AdminPanelInset>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.clientId ? (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/clients/${encodeURIComponent(project.clientId)}`}>
                            Open Client
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm">
                          <Link href="/dashboard/clients">Link Client</Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/command?projectId=${encodeURIComponent(project.id)}`}>Tasks</Link>
                      </Button>
                    </div>
                  </CardContent>
                </AdminPanel>
              )
            })
          )}
        </div>

        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle className="flex items-center gap-2">
              <AppWindow className="h-5 w-5" />
              Specialized Sync Tools
            </AdminPanelTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Link href="/dashboard/clients/vercel-sync">
              <AdminPanelInset className="transition hover:bg-muted/40">
                <p className="font-medium text-foreground">Vercel Sync</p>
                <p className="mt-1 text-sm text-muted-foreground">Discovery, production domains, and client/project linking.</p>
              </AdminPanelInset>
            </Link>
            <Link href="/dashboard/web-development/app-store-sync">
              <AdminPanelInset className="transition hover:bg-muted/40">
                <p className="font-medium text-foreground">App Store Sync</p>
                <p className="mt-1 text-sm text-muted-foreground">App Store Connect apps, builds, and TestFlight groups.</p>
              </AdminPanelInset>
            </Link>
          </CardContent>
        </AdminPanel>
      </div>
    </DashboardLayout>
  )
}
