"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  CheckCircle,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  Users,
  Video,
  Wallet,
} from "lucide-react"

import type { AdminWorkspaceDetail } from "@/lib/admin/workspace-detail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { WorkspaceQuestionnairesPanel } from "@/components/admin/workspace-questionnaires-panel"

type ProjectRecord = {
  id: string
  name?: string
  title?: string
  status?: string
  clientId?: string
  workspaceId?: string
  summary?: string
  description?: string
  projectType?: string
  githubRepo?: string
  repoSlug?: string
  deployUrl?: string
  liveUrl?: string
  deployHosts?: string[]
  githubRepos?: string[]
  pulseSummary?: string
  scopeObjectives?: Array<{ id?: string; title?: string; description?: string }>
  deliverables?: string[]
}

type TaskRecord = {
  id: string
  title?: string
  status?: string
  projectId?: string
  workspaceId?: string
  objectiveId?: string
  objectiveTitle?: string
}

type DeliverableRecord = {
  id: string
  title?: string
  summary?: string
  status?: string
  amount?: number
  projectId?: string | null
  liveUrl?: string | null
}

type RepoRecord = {
  id: string
  repoSlug?: string
  githubRepo?: string
  htmlUrl?: string | null
  projectId?: string | null
  clientId?: string | null
}

type ProjectSuggestionRecord = {
  id: string
  projectId?: string
  projectTitle?: string
  projectType?: string | null
  workspaceId?: string
  clientId?: string | null
  clientName?: string
  clientEmail?: string | null
  rawText?: string | null
  summary?: string
  urgency?: string
  status?: string
  source?: string
  agentContextStatus?: string
  createdAt?: string | null
}

type ClientSignalRecord = {
  id: string
  name?: string
  storyId?: string
  githubRepo?: string
  githubRepos?: string[]
  deployUrl?: string
  deployHosts?: string[]
  vercelProjectName?: string
  pulseSummary?: string
  pulseReport?: {
    snapshot?: {
      matchedEventCount?: number
      matchedGithubEventCount?: number
      matchedVercelEventCount?: number
    }
    workItems?: Array<{ title?: string; priority?: string; status?: string; source?: string }>
  }
}

type PulseAuditState = {
  summary?: string
  suggestions: string[]
  matchedEventCount?: number
}

type InjectProjectDraft = {
  title: string
  summary: string
  repoSlug: string
  vercelProjectSlug: string
}

function recordTitle(record: ProjectRecord) {
  return record.name || record.title || record.id
}

function statusTone(status?: string) {
  if (status === "done" || status === "complete" || status === "completed" || status === "paid" || status === "published") return "bg-emerald-100 text-emerald-700"
  if (status === "blocked" || status === "declined" || status === "error") return "bg-rose-100 text-rose-700"
  if (status === "in_progress" || status === "active" || status === "accepted") return "bg-blue-100 text-blue-700"
  return "bg-slate-100 text-slate-600"
}

function projectObjectives(project: ProjectRecord) {
  if (Array.isArray(project.scopeObjectives) && project.scopeObjectives.length > 0) {
    return project.scopeObjectives.map((objective, index) => ({
      id: objective.id || `objective-${index}`,
      title: objective.title || `Objective ${index + 1}`,
      description: objective.description || "",
    }))
  }
  if (Array.isArray(project.deliverables) && project.deliverables.length > 0) {
    return project.deliverables.map((title, index) => ({
      id: `deliverable-${index}`,
      title,
      description: "Derived from project deliverables.",
    }))
  }
  return [{ id: "scope", title: "Scope objectives pending", description: "Add canonical objectives to this project." }]
}

function taskMatches(task: TaskRecord, objective: { id: string; title: string }) {
  if (task.objectiveId === objective.id) return true
  return Boolean(
    task.objectiveTitle?.toLowerCase() === objective.title.toLowerCase() ||
      task.title?.toLowerCase().includes(objective.title.toLowerCase())
  )
}

async function readData<T>(url: string, key = "data"): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) return []
  return (Array.isArray(payload[key]) ? payload[key] : Array.isArray(payload.data) ? payload.data : []) as T[]
}

async function readClientSignal(clientId: string): Promise<ClientSignalRecord | null> {
  const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, { cache: "no-store" })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false || !payload.client) return null
  return payload.client as ClientSignalRecord
}

function firstRepo(project: ProjectRecord | ClientSignalRecord | null): string | undefined {
  if (!project) return undefined
  return project.githubRepos?.[0] || project.githubRepo || ("repoSlug" in project ? project.repoSlug : undefined)
}

function firstHost(project: ProjectRecord | ClientSignalRecord | null): string | undefined {
  if (!project) return undefined
  return project.deployUrl || project.deployHosts?.[0] || ("liveUrl" in project ? project.liveUrl : undefined)
}

function buildClientSignalProject(client: ClientSignalRecord | null): ProjectRecord | null {
  if (!client) return null
  const repo = firstRepo(client)
  const host = firstHost(client)
  if (!repo && !host && !client.vercelProjectName) return null

  return {
    id: "client-linked-project",
    name: client.vercelProjectName || client.name || "Linked project",
    status: host ? "linked" : "repo_linked",
    clientId: client.id,
    summary: client.pulseSummary || "Derived from the client-level GitHub/Vercel linkage.",
    projectType: "client-linkage",
    githubRepo: repo,
    githubRepos: client.githubRepos,
    repoSlug: repo,
    deployUrl: client.deployUrl || (host ? `https://${host}` : undefined),
    deployHosts: client.deployHosts,
    pulseSummary: client.pulseSummary,
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unknown"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatCurrency(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount)
}

export function WorkspaceProjectControlCenter({
  clientId,
  workspaceId,
  workspaceName,
  detail,
  quickEditHref,
  quickReposHref,
}: {
  clientId?: string | null
  workspaceId: string
  workspaceName?: string
  detail: AdminWorkspaceDetail
  quickEditHref?: string
  quickReposHref?: string
}) {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [deliverables, setDeliverables] = useState<DeliverableRecord[]>([])
  const [repos, setRepos] = useState<RepoRecord[]>([])
  const [suggestions, setSuggestions] = useState<ProjectSuggestionRecord[]>([])
  const [clientSignal, setClientSignal] = useState<ClientSignalRecord | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pulseAudit, setPulseAudit] = useState<PulseAuditState | null>(null)
  const [pulseAuditLoading, setPulseAuditLoading] = useState(false)
  const [pulseAuditError, setPulseAuditError] = useState<string | null>(null)
  const [injectOpen, setInjectOpen] = useState(false)
  const [injectSaving, setInjectSaving] = useState(false)
  const [injectError, setInjectError] = useState<string | null>(null)
  const [injectDraft, setInjectDraft] = useState<InjectProjectDraft>({
    title: "",
    summary: "",
    repoSlug: "",
    vercelProjectSlug: "",
  })

  const loadWorkspaceMap = async () => {
    let cancelled = false
    setLoading(true)
    const projectQuery = `/api/admin/projects?workspaceId=${encodeURIComponent(workspaceId)}&limit=200`
    const taskQuery = `/api/admin/tasks?workspaceId=${encodeURIComponent(workspaceId)}&limit=200`

    const requests = await Promise.all([
      readData<ProjectRecord>(projectQuery),
      readData<TaskRecord>(taskQuery),
      clientId ? readData<RepoRecord>(`/api/admin/repos?clientId=${encodeURIComponent(clientId)}&limit=200`) : Promise.resolve([]),
      readData<ProjectSuggestionRecord>(
        `/api/admin/project-suggestions?workspaceId=${encodeURIComponent(workspaceId)}${clientId ? `&clientId=${encodeURIComponent(clientId)}` : ""}&limit=100`
      ),
      clientId ? readData<DeliverableRecord>(`/api/clients/${encodeURIComponent(clientId)}/deliverables`, "data") : Promise.resolve([]),
      clientId ? readClientSignal(clientId) : Promise.resolve(null),
    ])

    if (cancelled) return
    const [nextProjects, nextTasks, nextRepos, nextSuggestions, nextDeliverables, nextClientSignal] = requests
    const signalProject = buildClientSignalProject(nextClientSignal)
    const mergedProjects =
      nextProjects.length > 0 || !signalProject
        ? nextProjects
        : [signalProject]

    setProjects(mergedProjects)
    setTasks(nextTasks)
    setRepos(nextRepos)
    setSuggestions(nextSuggestions)
    setDeliverables(nextDeliverables)
    setClientSignal(nextClientSignal)
    setSelectedProjectId((current) => current || mergedProjects[0]?.id || null)
    setLoading(false)
  }

  useEffect(() => {
    void loadWorkspaceMap()
  }, [clientId, workspaceId])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  )
  const selectedTasks = useMemo(
    () => tasks.filter((task) => !selectedProject || task.projectId === selectedProject.id),
    [selectedProject, tasks]
  )
  const selectedSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !selectedProject || suggestion.projectId === selectedProject.id),
    [selectedProject, suggestions]
  )
  const linkedRepoCount = useMemo(() => {
    const values = [
      ...repos.map((repo) => repo.repoSlug || repo.githubRepo || ""),
      ...(clientSignal?.githubRepos ?? []),
      clientSignal?.githubRepo ?? "",
      ...projects.flatMap((project) => [project.githubRepo ?? "", project.repoSlug ?? "", ...(project.githubRepos ?? [])]),
    ].filter(Boolean)
    return new Set(values).size
  }, [clientSignal, projects, repos])
  const linkedHostCount = useMemo(() => {
    const values = [
      clientSignal?.deployUrl ?? "",
      ...(clientSignal?.deployHosts ?? []),
      ...projects.flatMap((project) => [project.deployUrl ?? "", project.liveUrl ?? "", ...(project.deployHosts ?? [])]),
    ].filter(Boolean)
    return new Set(values).size
  }, [clientSignal, projects])

  const handleRunPulseAudit = async () => {
    if (!clientId) return
    setPulseAuditLoading(true)
    setPulseAuditError(null)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/pulse-suggestions`, {
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Failed to run pulse audit")
      }
      setPulseAudit({
        summary: payload.summary,
        suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
        matchedEventCount: payload.matchedEventCount,
      })
    } catch (error) {
      setPulseAuditError(error instanceof Error ? error.message : "Failed to run pulse audit")
    } finally {
      setPulseAuditLoading(false)
    }
  }

  const handleInjectProject = async () => {
    if (!injectDraft.title.trim()) {
      setInjectError("Project title is required.")
      return
    }

    setInjectSaving(true)
    setInjectError(null)
    try {
      const response = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: injectDraft.title.trim(),
          summary: injectDraft.summary.trim(),
          repoSlug: injectDraft.repoSlug.trim(),
          vercelProjectSlug: injectDraft.vercelProjectSlug.trim(),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Failed to inject project")
      }
      setInjectOpen(false)
      setInjectDraft({ title: "", summary: "", repoSlug: "", vercelProjectSlug: "" })
      await loadWorkspaceMap()
    } catch (error) {
      setInjectError(error instanceof Error ? error.message : "Failed to inject project")
    } finally {
      setInjectSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Workspace Operations Mirror</CardTitle>
          <CardDescription>
            Visibility-first admin surface for {workspaceName || workspaceId}. Read current workspace state and use existing narrow write actions without leaving the admin app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="projects" className="space-y-4">
            <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              <TabsTrigger value="projects"><Target className="mr-2 h-4 w-4" />Projects</TabsTrigger>
              <TabsTrigger value="suggestions"><MessageSquare className="mr-2 h-4 w-4" />Suggestions</TabsTrigger>
              <TabsTrigger value="contracts"><FileText className="mr-2 h-4 w-4" />Contracts</TabsTrigger>
              <TabsTrigger value="deliverables"><CheckCircle className="mr-2 h-4 w-4" />Deliverables</TabsTrigger>
              <TabsTrigger value="retainer"><Wallet className="mr-2 h-4 w-4" />Retainer</TabsTrigger>
              <TabsTrigger value="updates"><Video className="mr-2 h-4 w-4" />Updates</TabsTrigger>
              <TabsTrigger value="intake"><FolderOpen className="mr-2 h-4 w-4" />Intake</TabsTrigger>
              <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>
              <TabsTrigger value="messages"><MessageSquare className="mr-2 h-4 w-4" />Messages / Files</TabsTrigger>
              <TabsTrigger value="repos"><Link2 className="mr-2 h-4 w-4" />Repos / Hosting</TabsTrigger>
              <TabsTrigger value="audit"><BarChart3 className="mr-2 h-4 w-4" />Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Workspace-linked projects, current deployment linkage, and objective-to-task alignment.
                </p>
                <Button onClick={() => setInjectOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Inject Project
                </Button>
              </div>

              {loading ? <p className="text-sm text-muted-foreground">Loading workspace project map...</p> : null}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-3">
                  {projects.length === 0 ? (
                    <p className="rounded-lg border p-4 text-sm text-muted-foreground">No child projects are linked yet.</p>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => setSelectedProjectId(project.id)}
                        className={`w-full rounded-lg border p-4 text-left transition-colors ${
                          selectedProject?.id === project.id ? "border-primary bg-primary/5" : "hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium">{recordTitle(project)}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(project.status)}`}>
                            {project.status || "active"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{project.projectType || project.id}</p>
                      </button>
                    ))
                  )}
                </div>

                <div className="space-y-3 lg:col-span-2">
                  {selectedProject ? (
                    <>
                      <div className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{recordTitle(selectedProject)}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {selectedProject.summary || selectedProject.description || "No project summary captured."}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {firstRepo(selectedProject) ? <Badge variant="secondary">{firstRepo(selectedProject)}</Badge> : null}
                            {firstHost(selectedProject) ? <Badge variant="secondary">{firstHost(selectedProject)}</Badge> : null}
                          </div>
                        </div>
                      </div>

                      {projectObjectives(selectedProject).map((objective) => {
                        const aligned = selectedTasks.filter((task) => taskMatches(task, objective))
                        const done = aligned.filter((task) => task.status === "done" || task.status === "complete").length
                        const progress = aligned.length ? Math.round((done / aligned.length) * 100) : 0
                        return (
                          <div key={objective.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1.3fr]">
                            <div>
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{objective.title}</p>
                                <span className="text-xs text-muted-foreground">{progress}%</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">{objective.description}</p>
                            </div>
                            <div className="space-y-2">
                              {aligned.length === 0 ? (
                                <p className="rounded bg-muted px-3 py-2 text-xs text-muted-foreground">No tasks aligned yet.</p>
                              ) : (
                                aligned.map((task) => (
                                  <div key={task.id} className="flex justify-between gap-3 rounded bg-muted px-3 py-2">
                                    <span className="text-sm">{task.title || "Untitled task"}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(task.status)}`}>
                                      {task.status || "proposed"}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  ) : (
                    <p className="rounded-lg border p-4 text-sm text-muted-foreground">Select a project to inspect scope alignment.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Workspace and project suggestions sourced through `clientFeedback`. If this view is empty for a known active workspace, verify the client submission path is writing `workspaceId`/`projectId`.
                </p>
                <Badge variant="secondary">{suggestions.length}</Badge>
              </div>
              {suggestions.length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No project suggestions are visible for this workspace yet.
                </p>
              ) : (
                suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(suggestion.status)}`}>
                          {suggestion.status || "open"}
                        </span>
                        {suggestion.urgency ? <Badge variant="outline">{suggestion.urgency}</Badge> : null}
                        {suggestion.projectTitle ? <Badge variant="secondary">{suggestion.projectTitle}</Badge> : null}
                      </div>
                      {suggestion.createdAt ? (
                        <span className="text-xs text-muted-foreground">{formatDateTime(suggestion.createdAt)}</span>
                      ) : null}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm">
                      {suggestion.rawText || suggestion.summary || "No suggestion body captured."}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Source: {suggestion.source || "workspace-project-suggestion"} · Agent context: {suggestion.agentContextStatus || "ready"}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="contracts" className="space-y-3">
              {detail.contracts.length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No contract records are linked to this workspace yet.
                </p>
              ) : (
                detail.contracts.map((contract) => (
                  <div key={contract.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{contract.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {contract.type || "Contract"} · {formatDateTime(contract.updatedAt)}
                        </p>
                      </div>
                      <Badge className={statusTone(contract.status)}>{contract.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contract.fileUrls.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No file links on record.</span>
                      ) : (
                        contract.fileUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-foreground hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open file
                          </a>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="deliverables" className="space-y-3">
              {deliverables.length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">No deliverables found.</p>
              ) : (
                deliverables.map((deliverable) => (
                  <div key={deliverable.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{deliverable.title || deliverable.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {deliverable.summary || deliverable.projectId || "Workspace deliverable"}
                      </p>
                      {deliverable.liveUrl ? (
                        <a href={deliverable.liveUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open live URL
                        </a>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{deliverable.status || "pending"}</Badge>
                      {typeof deliverable.amount === "number" && deliverable.amount > 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">{formatCurrency(deliverable.amount)}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="retainer" className="space-y-3">
              {!detail.client ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  This workspace is not linked to a canonical client yet, so retainer visibility is blocked.
                </p>
              ) : !detail.retainer.exists ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  Linked client has no retainer record yet. Add `clients/{'{id}'}.retainer` and pool contributions to unlock this surface.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Committed</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCurrency(detail.retainer.amountTotal ?? 0, detail.retainer.currency ?? "usd")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{detail.retainer.active ? "Active" : "Inactive"} · {detail.retainer.source || "manual"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Received</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCurrency(detail.retainer.totalReceived, detail.retainer.currency ?? "usd")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{detail.retainer.contributionCount} contribution{detail.retainer.contributionCount === 1 ? "" : "s"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pool allocated</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCurrency(detail.retainer.totalAllocated, detail.retainer.currency ?? "usd")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{detail.retainer.allocationCount} pool allocation{detail.retainer.allocationCount === 1 ? "" : "s"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pool linkage</p>
                    <p className="mt-2 text-lg font-semibold">{detail.retainer.poolName || detail.retainer.poolId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Latest contribution: {detail.retainer.latestContributionAt ? formatDateTime(detail.retainer.latestContributionAt) : "None"}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="updates" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Client updates feed</p>
                    <Badge variant="secondary">{detail.updates.length}</Badge>
                  </div>
                  {detail.updates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No client updates recorded yet.</p>
                  ) : (
                    detail.updates.map((update) => (
                      <div key={update.id} className="rounded bg-muted p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{update.title}</p>
                          <Badge className={statusTone(update.status)}>{update.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(update.createdAt)} · {update.type}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{update.summary || update.details || update.body || "No summary provided."}</p>
                        {update.video?.publicUrl ? (
                          <a href={update.video.publicUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open update video
                          </a>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Status videos</p>
                    <Badge variant="secondary">{detail.statusVideos.length}</Badge>
                  </div>
                  {detail.statusVideos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No status videos surfaced for this workspace yet.</p>
                  ) : (
                    detail.statusVideos.map((video) => (
                      <div key={`${video.clientId}:${video.id}`} className="rounded bg-muted p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{video.title}</p>
                          <span className="text-xs text-muted-foreground">{formatDateTime(video.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{video.clientId} · {video.category || "uncategorized"}</p>
                        {video.aiSummary.length > 0 ? (
                          <p className="mt-2 text-sm text-muted-foreground">{video.aiSummary[0]}</p>
                        ) : null}
                        {video.videoUrl ? (
                          <a href={video.videoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open video
                          </a>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="intake">
              <WorkspaceQuestionnairesPanel workspaceId={workspaceId} workspaceName={workspaceName || workspaceId} />
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Active members</p>
                    <Badge variant="secondary">{detail.members.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {detail.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No workspace members found.</p>
                    ) : (
                      detail.members.map((member) => (
                        <div key={member.id} className="rounded bg-muted px-3 py-2">
                          <p className="font-medium">{member.displayName || member.email || member.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.role || "No role"} · {member.status || "unknown"} · {member.source || "manual"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Pending invites</p>
                    <Badge variant="secondary">{detail.pendingInvites.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {detail.pendingInvites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending invites.</p>
                    ) : (
                      detail.pendingInvites.map((invite) => (
                        <div key={invite.id} className="rounded bg-muted px-3 py-2">
                          <p className="font-medium">{invite.email || invite.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {invite.role || "No role"} · invited {formatDateTime(invite.invitedAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Recent email threads</p>
                    <Badge variant="secondary">{detail.emails.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {detail.emails.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No synced workspace emails are visible yet.</p>
                    ) : (
                      detail.emails.map((email) => (
                        <div key={email.id} className="rounded bg-muted px-3 py-2">
                          <p className="font-medium">{email.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {email.from || "Unknown sender"} · {formatDateTime(email.date)}
                          </p>
                          {email.snippet ? <p className="mt-1 text-sm text-muted-foreground">{email.snippet}</p> : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Calendar / meetings</p>
                    <Badge variant="secondary">{detail.events.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {detail.events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No workspace-linked meeting records found.</p>
                    ) : (
                      detail.events.map((event) => (
                        <div key={event.id} className="rounded bg-muted px-3 py-2">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(event.start)} · {event.attendees.length} attendee{event.attendees.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Shared file references</p>
                  <Badge variant="secondary">{detail.fileReferences.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {detail.fileReferences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No canonical file references are exposed for this workspace yet.</p>
                  ) : (
                    detail.fileReferences.map((file) => (
                      <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded bg-muted px-3 py-2 text-sm hover:underline">
                        <span>{file.label}</span>
                        <span className="text-xs text-muted-foreground">{file.source}</span>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="repos" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Linked repos</p>
                  <p className="mt-2 text-2xl font-semibold">{linkedRepoCount}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Linked hosts</p>
                  <p className="mt-2 text-2xl font-semibold">{linkedHostCount}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace repos</p>
                  <p className="mt-2 text-2xl font-semibold">{detail.workspace.repoCount}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Deploy records</p>
                  <p className="mt-2 text-2xl font-semibold">{detail.workspace.vercelCount}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickReposHref ? (
                  <Button asChild variant="outline">
                    <a href={quickReposHref}>Manage repo links</a>
                  </Button>
                ) : null}
                {quickEditHref ? (
                  <Button asChild variant="outline">
                    <a href={quickEditHref}>Quick edit workspace</a>
                  </Button>
                ) : null}
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-medium">Current linkage</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {repos.length === 0 && !clientSignal ? (
                    <span className="text-sm text-muted-foreground">No repo or hosting linkage found yet.</span>
                  ) : (
                    <>
                      {repos.map((repo) => (
                        <Badge key={repo.id} variant="outline">{repo.repoSlug || repo.githubRepo || repo.id}</Badge>
                      ))}
                      {clientSignal?.deployUrl ? <Badge variant="secondary">{clientSignal.deployUrl}</Badge> : null}
                      {clientSignal?.deployHosts?.map((host) => <Badge key={host} variant="secondary">{host}</Badge>)}
                    </>
                  )}
                </div>

                {Object.keys(detail.workspace.hosting).length > 0 ? (
                  <pre className="mt-4 overflow-x-auto rounded bg-muted p-3 text-xs text-muted-foreground">
                    {JSON.stringify(detail.workspace.hosting, null, 2)}
                  </pre>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-6">
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{projects.length}</p>
                  <p className="text-xs text-muted-foreground">Child projects</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{tasks.length}</p>
                  <p className="text-xs text-muted-foreground">Tracked tasks</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{suggestions.filter((item) => item.status !== "resolved").length}</p>
                  <p className="text-xs text-muted-foreground">Open suggestions</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{detail.contracts.length}</p>
                  <p className="text-xs text-muted-foreground">Contracts</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{detail.updates.length}</p>
                  <p className="text-xs text-muted-foreground">Updates</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Workspace gate active
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Canonical role contract is the control point.</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">GitHub / Vercel Pulse Audit</p>
                    <p className="text-sm text-muted-foreground">
                      Uses the client-level repo and host selectors to pull matched Pulse events and persist a summary.
                    </p>
                  </div>
                  <Button onClick={handleRunPulseAudit} disabled={pulseAuditLoading || !clientId}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${pulseAuditLoading ? "animate-spin" : ""}`} />
                    {pulseAuditLoading ? "Auditing..." : "Run Pulse Audit"}
                  </Button>
                </div>

                {pulseAuditError ? (
                  <p className="mt-3 text-sm text-amber-600">{pulseAuditError}</p>
                ) : null}

                {pulseAudit ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded bg-muted p-3">
                      <p className="text-sm font-medium">{pulseAudit.summary || "Pulse audit completed."}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Matched events: {pulseAudit.matchedEventCount ?? 0}
                      </p>
                    </div>
                    {pulseAudit.suggestions.length > 0 ? (
                      <div className="space-y-2">
                        {pulseAudit.suggestions.map((suggestion) => (
                          <p key={suggestion} className="rounded border px-3 py-2 text-sm text-muted-foreground">
                            {suggestion}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : clientSignal?.pulseSummary ? (
                  <div className="mt-4 rounded bg-muted p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Current saved pulse summary</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{clientSignal.pulseSummary}</p>
                  </div>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={injectOpen} onOpenChange={setInjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inject Workspace Project</DialogTitle>
            <DialogDescription>
              Create a workspace-linked project record using the existing admin injection path.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={injectDraft.title} onChange={(event) => setInjectDraft((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Summary</label>
              <Textarea value={injectDraft.summary} onChange={(event) => setInjectDraft((current) => ({ ...current, summary: event.target.value }))} rows={4} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Repo slug</label>
              <Input value={injectDraft.repoSlug} onChange={(event) => setInjectDraft((current) => ({ ...current, repoSlug: event.target.value }))} placeholder="owner/repo" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vercel project slug</label>
              <Input value={injectDraft.vercelProjectSlug} onChange={(event) => setInjectDraft((current) => ({ ...current, vercelProjectSlug: event.target.value }))} placeholder="project-name" />
            </div>
            {injectError ? <p className="text-sm text-red-600">{injectError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInjectOpen(false)} disabled={injectSaving}>Cancel</Button>
            <Button onClick={() => void handleInjectProject()} disabled={injectSaving}>
              {injectSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
