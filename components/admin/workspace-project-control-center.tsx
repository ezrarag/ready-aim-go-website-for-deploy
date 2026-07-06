"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, CheckCircle, FileText, MessageSquare, RefreshCw, ShieldCheck, Target, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
}

type RepoRecord = {
  id: string
  repoSlug?: string
  githubRepo?: string
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

function recordTitle(record: ProjectRecord) {
  return record.name || record.title || record.id
}

function statusTone(status?: string) {
  if (status === "done" || status === "complete" || status === "completed" || status === "paid") return "bg-emerald-100 text-emerald-700"
  if (status === "blocked" || status === "declined") return "bg-rose-100 text-rose-700"
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

export function WorkspaceProjectControlCenter({
  clientId,
  workspaceId,
}: {
  clientId: string
  workspaceId?: string | null
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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const projectQuery = workspaceId
      ? `/api/admin/projects?workspaceId=${encodeURIComponent(workspaceId)}&limit=200`
      : `/api/admin/projects?clientId=${encodeURIComponent(clientId)}&limit=200`
    const taskQuery = workspaceId
      ? `/api/admin/tasks?workspaceId=${encodeURIComponent(workspaceId)}&limit=200`
      : `/api/admin/tasks?clientId=${encodeURIComponent(clientId)}&limit=200`

    Promise.all([
      readData<ProjectRecord>(projectQuery),
      readData<TaskRecord>(taskQuery),
      readData<RepoRecord>(`/api/admin/repos?clientId=${encodeURIComponent(clientId)}&limit=200`),
      readData<ProjectSuggestionRecord>(
        workspaceId
          ? `/api/admin/project-suggestions?workspaceId=${encodeURIComponent(workspaceId)}&clientId=${encodeURIComponent(clientId)}&limit=100`
          : `/api/admin/project-suggestions?clientId=${encodeURIComponent(clientId)}&limit=100`
      ),
      readData<DeliverableRecord>(`/api/clients/${encodeURIComponent(clientId)}/deliverables`, "data"),
      readClientSignal(clientId),
    ])
      .then(([nextProjects, nextTasks, nextRepos, nextSuggestions, nextDeliverables, nextClientSignal]) => {
        if (cancelled) return
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace & Project Control Center</CardTitle>
        <CardDescription>
          Account-level controls and child project execution maps for the workspace-first model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects"><Target className="mr-2 h-4 w-4" />Projects</TabsTrigger>
            <TabsTrigger value="contracts"><FileText className="mr-2 h-4 w-4" />Contracts</TabsTrigger>
            <TabsTrigger value="retainer">Retainer</TabsTrigger>
            <TabsTrigger value="deliverables"><CheckCircle className="mr-2 h-4 w-4" />Deliverables</TabsTrigger>
            <TabsTrigger value="correspondence"><MessageSquare className="mr-2 h-4 w-4" />Correspondence</TabsTrigger>
            <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Role/Team</TabsTrigger>
            <TabsTrigger value="audit"><BarChart3 className="mr-2 h-4 w-4" />Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">Loading workspace map...</p> : null}
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
              <div className="lg:col-span-2 space-y-3">
                {selectedProject ? (
                  <>
                    <div className="rounded-lg border p-4">
                      <p className="font-semibold">{recordTitle(selectedProject)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedProject.summary || selectedProject.description || "No project summary captured."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{firstRepo(selectedProject) || firstRepo(clientSignal) || "No repo"}</Badge>
                        <Badge variant="secondary">{firstHost(selectedProject) || firstHost(clientSignal) || "No host"}</Badge>
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
                    <div className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">Client project suggestions</p>
                          <p className="text-sm text-muted-foreground">
                            Captured from the client portal Projects tab and available to raCommand/Codex context through clientFeedback.
                          </p>
                        </div>
                        <Badge variant="secondary">{selectedSuggestions.length}</Badge>
                      </div>

                      {selectedSuggestions.length === 0 ? (
                        <p className="mt-3 rounded bg-muted px-3 py-2 text-xs text-muted-foreground">
                          No client suggestions recorded for this project.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {selectedSuggestions.slice(0, 6).map((suggestion) => (
                            <div key={suggestion.id} className="rounded bg-muted px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(suggestion.status)}`}>
                                    {suggestion.status || "open"}
                                  </span>
                                  <Badge variant="outline">{suggestion.urgency || "medium"}</Badge>
                                  {suggestion.projectType ? <Badge variant="secondary">{suggestion.projectType}</Badge> : null}
                                </div>
                                {suggestion.createdAt ? (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(suggestion.createdAt).toLocaleString()}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm">
                                {suggestion.rawText || suggestion.summary || "No suggestion text captured."}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Agent context: {suggestion.agentContextStatus || "ready"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contracts">
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              MSA and project SOW controls are now scoped for workspace linkage. Existing contract sections remain available under client contracts until the editor is promoted here.
            </p>
          </TabsContent>

          <TabsContent value="retainer">
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              Retainer tracking will read value-profile payments, contract value, billing cadence, and milestone state for this workspace.
            </p>
          </TabsContent>

          <TabsContent value="deliverables" className="space-y-3">
            {deliverables.length === 0 ? (
              <p className="rounded-lg border p-4 text-sm text-muted-foreground">No deliverables found.</p>
            ) : (
              deliverables.map((deliverable) => (
                <div key={deliverable.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{deliverable.title || deliverable.id}</p>
                    <p className="text-sm text-muted-foreground">{deliverable.summary || deliverable.projectId || "Workspace deliverable"}</p>
                  </div>
                  <Badge variant="secondary">{deliverable.status || "pending"}</Badge>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="correspondence">
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              Account correspondence is sourced from clientComms/{clientId}. Owner/developer privacy scoping is enforced in the portal before client visibility.
            </p>
          </TabsContent>

          <TabsContent value="team">
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              Team assignment remains handled by the Assign Portal Workspace card above; approved users are written into both legacy memberships and workspace members.
            </p>
          </TabsContent>

          <TabsContent value="audit">
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
                <p className="text-2xl font-bold">{linkedRepoCount}</p>
                <p className="text-xs text-muted-foreground">Linked repos</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{linkedHostCount}</p>
                <p className="text-xs text-muted-foreground">Linked hosts</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{suggestions.filter((item) => item.status !== "resolved").length}</p>
                <p className="text-xs text-muted-foreground">Open suggestions</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> Workspace gate active
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Canonical role contract is the control point.</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">GitHub / Vercel Pulse Audit</p>
                  <p className="text-sm text-muted-foreground">
                    Uses the client-level repo and host selectors to pull matched Pulse events and persist a summary.
                  </p>
                </div>
                <Button onClick={handleRunPulseAudit} disabled={pulseAuditLoading || linkedRepoCount + linkedHostCount === 0}>
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
  )
}
