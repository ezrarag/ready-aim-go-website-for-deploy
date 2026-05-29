"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  AppWindow,
  ArrowRight,
  FolderKanban,
  GitBranch,
  Globe,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { useToast } from "@/hooks/use-toast"
import {
  getProjectRelationshipMeta,
  isRelationshipRecord,
  normalizeAdminClientRecord,
  normalizeAdminProjectRecord,
  normalizeAdminTaskRecord,
  sortByUpdatedDesc,
  type AdminClientRecord,
  type AdminProjectLinkState,
  type AdminProjectRecord,
  type AdminTaskRecord,
} from "@/lib/admin/ops-data"

type ProjectsState = {
  clients: AdminClientRecord[]
  projects: AdminProjectRecord[]
  tasks: AdminTaskRecord[]
  errors: string[]
}

type ProjectRow = {
  project: AdminProjectRecord
  linkedClient: AdminClientRecord | null
  linkState: AdminProjectLinkState
  suggestedEmail: string | null
}

type CreateClientForm = {
  email: string
  name: string
  storyId: string
  notes: string
}

type CreateClientResult = {
  clientId: string
  message: string
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

function linkStateClass(linkState: AdminProjectLinkState) {
  if (linkState === "linked") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (linkState === "email-client-id") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  if (linkState === "missing-client") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
  return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
}

function linkStateLabel(linkState: AdminProjectLinkState) {
  if (linkState === "linked") return "Linked"
  if (linkState === "email-client-id") return "Portal Project"
  if (linkState === "missing-client") return "Missing Client"
  return "Repo Project"
}

function projectMatches(row: ProjectRow, search: string) {
  if (!search) return true
  const { project, linkedClient, suggestedEmail } = row
  return [
    project.name,
    project.clientId,
    project.clientName,
    project.workspaceId,
    project.clientPortalEmail,
    suggestedEmail,
    linkedClient?.name,
    linkedClient?.storyId,
    project.githubRepo,
    ...project.githubRepos,
    ...project.repositoryChains,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search.toLowerCase())
}

function humanizeEmailName(email: string): string {
  const localPart = email.split("@")[0] || email
  const words = localPart.replace(/[._+-]+/g, " ").split(" ").map((word) => word.trim()).filter(Boolean)
  return words.length ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ") : email
}

function slugifyClientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildCreateClientForm(row: ProjectRow): CreateClientForm {
  const email = row.suggestedEmail || ""
  const name = row.project.clientName || humanizeEmailName(email || row.project.name)
  return {
    email,
    name,
    storyId: slugifyClientName(name),
    notes: `Created from project ${row.project.name} (${row.project.id}).`,
  }
}

function ProjectCard({
  row,
  taskCount,
  onLinkClient,
  onCreateClient,
}: {
  row: ProjectRow
  taskCount: number
  onLinkClient: (row: ProjectRow) => void
  onCreateClient: (row: ProjectRow) => void
}) {
  const { project, linkedClient, linkState, suggestedEmail } = row
  const repo = project.githubRepo || project.githubRepos[0] || project.repositoryChains[0] || "Missing"
  const identity = linkedClient?.name || (linkState === "linked" ? project.clientId : "No relationship client linked")

  return (
    <AdminPanel>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <AdminPanelTitle className="truncate text-lg">{project.name}</AdminPanelTitle>
            <p className="mt-1 truncate text-sm text-muted-foreground">{identity}</p>
            {!linkedClient && suggestedEmail ? (
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{suggestedEmail}</p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={statusClass(project.status)}>{project.status}</Badge>
            <Badge className={linkStateClass(linkState)}>{linkStateLabel(linkState)}</Badge>
          </div>
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
            <p className="mt-2 truncate text-sm text-foreground">{repo}</p>
          </AdminPanelInset>
        </div>
        <div className="flex flex-wrap gap-2">
          {linkedClient ? (
            <Button asChild size="sm">
              <Link href={`/dashboard/clients/${encodeURIComponent(linkedClient.id)}`}>
                Open Client
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => onLinkClient(row)}>
                <Link2 className="mr-2 h-4 w-4" />
                Link Client
              </Button>
              {suggestedEmail ? (
                <Button size="sm" variant="outline" onClick={() => onCreateClient(row)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Client
                </Button>
              ) : null}
            </>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/command?projectId=${encodeURIComponent(project.id)}`}>
              {linkedClient ? "Tasks" : "Review Project"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </AdminPanel>
  )
}

export default function WebDevelopmentPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [state, setState] = useState<ProjectsState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [linkProject, setLinkProject] = useState<ProjectRow | null>(null)
  const [selectedClientId, setSelectedClientId] = useState("")
  const [linkingProject, setLinkingProject] = useState(false)
  const [createProject, setCreateProject] = useState<ProjectRow | null>(null)
  const [createForm, setCreateForm] = useState<CreateClientForm>({ email: "", name: "", storyId: "", notes: "" })
  const [creatingClient, setCreatingClient] = useState(false)
  const [createResult, setCreateResult] = useState<CreateClientResult | null>(null)
  const selectedClientFilter = searchParams.get("clientId")

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

  const relationships = useMemo(() => sortByUpdatedDesc(state.clients.filter(isRelationshipRecord)), [state.clients])
  const clientById = useMemo(() => new Map(relationships.map((client) => [client.id, client])), [relationships])
  const projectRows = useMemo<ProjectRow[]>(() => {
    return sortByUpdatedDesc(state.projects).map((project) => ({
      project,
      ...getProjectRelationshipMeta(project, clientById),
    }))
  }, [state.projects, clientById])
  const activeRows = useMemo(() => projectRows.filter((row) => row.project.status !== "archived"), [projectRows])
  const linkedRows = useMemo(() => activeRows.filter((row) => row.linkState === "linked"), [activeRows])
  const unlinkedRows = useMemo(() => activeRows.filter((row) => row.linkState !== "linked"), [activeRows])
  const projectTaskCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const task of state.tasks) {
      if (!task.projectId) continue
      counts.set(task.projectId, (counts.get(task.projectId) ?? 0) + 1)
    }
    return counts
  }, [state.tasks])
  const visibleRows = useMemo(() => {
    return projectRows
      .filter((row) => !selectedClientFilter || row.project.clientId === selectedClientFilter)
      .filter((row) => statusFilter === "all" || row.project.status === statusFilter)
      .filter((row) => projectMatches(row, search))
  }, [projectRows, selectedClientFilter, statusFilter, search])
  const visibleLinkedRows = visibleRows.filter((row) => row.linkState === "linked")
  const visibleUnlinkedRows = visibleRows.filter((row) => row.linkState !== "linked")
  const selectedClient = relationships.find((client) => client.id === selectedClientId) ?? null
  const canCreateClient = Boolean(createForm.email && createForm.name.trim() && createForm.storyId.trim())

  const openLinkDialog = (row: ProjectRow) => {
    setLinkProject(row)
    setSelectedClientId("")
  }

  const submitLinkProject = async () => {
    if (!linkProject || !selectedClient) return
    setLinkingProject(true)
    try {
      const response = await fetch(`/api/admin/projects/${encodeURIComponent(linkProject.project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          clientPortalEmail: selectedClient.clientPortalEmail || selectedClient.contactEmail || linkProject.suggestedEmail,
          workspaceId: selectedClient.workspaceId || linkProject.project.workspaceId,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || `Link failed with ${response.status}`)
      }
      toast({ title: "Project linked", description: `${linkProject.project.name} is now linked to ${selectedClient.name}.` })
      setLinkProject(null)
      await loadProjects()
    } catch (error) {
      toast({
        title: "Unable to link project",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLinkingProject(false)
    }
  }

  const openCreateDialog = (row: ProjectRow) => {
    setCreateProject(row)
    setCreateForm(buildCreateClientForm(row))
    setCreateResult(null)
  }

  const submitCreateClient = async () => {
    if (!createProject || !canCreateClient) return
    setCreatingClient(true)
    try {
      const response = await fetch("/api/admin/clients/from-portal-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createForm.email,
          name: createForm.name,
          storyId: createForm.storyId,
          notes: createForm.notes,
          sourceProjectId: createProject.project.id,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || `Create failed with ${response.status}`)
      }
      const result = {
        clientId: String(payload.clientId || ""),
        message: String(payload.message || "Client created."),
      }
      setCreateResult(result)
      toast({ title: "Client created", description: result.message })
      await loadProjects()
    } catch (error) {
      toast({
        title: "Unable to create client",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCreatingClient(false)
    }
  }

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
          <AdminMetricTile label="Active Projects" value={loading ? "..." : activeRows.length} trailing={<FolderKanban className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Linked Projects" value={loading ? "..." : linkedRows.length} hint={`${relationships.length} relationship clients`} trailing={<Globe className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Unlinked Projects" value={loading ? "..." : unlinkedRows.length} hint="Needs link or conversion" trailing={<AlertTriangle className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Repos" value={loading ? "..." : activeRows.filter((row) => row.project.githubRepo || row.project.githubRepos.length > 0).length} trailing={<GitBranch className="h-5 w-5 text-muted-foreground" />} />
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

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Unlinked Projects</h2>
              <p className="text-sm text-muted-foreground">Visible operational projects that do not resolve to a relationship client.</p>
            </div>
            <Badge variant="outline">{visibleUnlinkedRows.length}</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleUnlinkedRows.length === 0 ? (
              <AdminPanel className="lg:col-span-2">
                <CardContent className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                  {loading ? "Loading projects..." : "No unlinked projects match this view."}
                </CardContent>
              </AdminPanel>
            ) : (
              visibleUnlinkedRows.map((row) => (
                <ProjectCard
                  key={row.project.id}
                  row={row}
                  taskCount={projectTaskCounts.get(row.project.id) ?? 0}
                  onLinkClient={openLinkDialog}
                  onCreateClient={openCreateDialog}
                />
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Linked Projects</h2>
              <p className="text-sm text-muted-foreground">Projects attached to canonical relationship clients.</p>
            </div>
            <Badge variant="outline">{visibleLinkedRows.length}</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleLinkedRows.length === 0 ? (
              <AdminPanel className="lg:col-span-2">
                <CardContent className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                  {loading ? "Loading projects..." : "No linked projects match this view."}
                </CardContent>
              </AdminPanel>
            ) : (
              visibleLinkedRows.map((row) => (
                <ProjectCard
                  key={row.project.id}
                  row={row}
                  taskCount={projectTaskCounts.get(row.project.id) ?? 0}
                  onLinkClient={openLinkDialog}
                  onCreateClient={openCreateDialog}
                />
              ))
            )}
          </div>
        </section>

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

      <Dialog open={Boolean(linkProject)} onOpenChange={(open) => !open && setLinkProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Project To Client</DialogTitle>
            <DialogDescription>
              Select an existing relationship client for this project. This does not create new clients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <AdminPanelInset className="p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Project</p>
              <p className="mt-2 font-medium text-foreground">{linkProject?.project.name}</p>
              {linkProject?.suggestedEmail ? <p className="mt-1 font-mono text-xs text-muted-foreground">{linkProject.suggestedEmail}</p> : null}
            </AdminPanelInset>
            <div className="grid gap-2">
              <Label>Relationship client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {relationships.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void submitLinkProject()} disabled={!selectedClientId || linkingProject}>
              {linkingProject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Link Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(createProject)} onOpenChange={(open) => !open && setCreateProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client From Project</DialogTitle>
            <DialogDescription>
              Create a hidden relationship client from the project email and link this project to it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="project-client-email">Email</Label>
              <Input id="project-client-email" value={createForm.email} readOnly className="font-mono text-xs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-client-name">Client name</Label>
              <Input
                id="project-client-name"
                value={createForm.name}
                onChange={(event) => {
                  const name = event.target.value
                  setCreateForm((current) => ({
                    ...current,
                    name,
                    storyId: current.storyId ? current.storyId : slugifyClientName(name),
                  }))
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-client-story-id">Story ID</Label>
              <Input
                id="project-client-story-id"
                value={createForm.storyId}
                onChange={(event) => setCreateForm((current) => ({ ...current, storyId: slugifyClientName(event.target.value) }))}
              />
            </div>
            <AdminPanelInset className="p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Portal role</p>
              <p className="mt-2 font-medium text-foreground">Owner</p>
            </AdminPanelInset>
            <div className="grid gap-2">
              <Label htmlFor="project-client-notes">Notes</Label>
              <Textarea
                id="project-client-notes"
                value={createForm.notes}
                onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            {createResult ? (
              <AdminPanelInset className="border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">
                {createResult.message}
              </AdminPanelInset>
            ) : null}
          </div>
          <DialogFooter>
            {createResult ? (
              <Button asChild>
                <Link href={`/dashboard/clients/${encodeURIComponent(createResult.clientId)}`}>
                  Open Client
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button onClick={() => void submitCreateClient()} disabled={!canCreateClient || creatingClient}>
                {creatingClient ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Create Client
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
