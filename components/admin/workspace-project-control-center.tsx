"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  CheckCircle,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
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
import { WorkspaceInvoicesPanel } from "@/components/admin/workspace-invoices-panel"
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
  workspaceId?: string | null
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
  adminResponse?: string | null
  taskId?: string | null
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

type SuggestionComposerState = {
  [suggestionId: string]: {
    status: string
    adminResponse: string
    saving: boolean
    error: string | null
  }
}

type ContractDraft = {
  title: string
  type: string
  status: string
  notes: string
  file: File | null
}

type UpdateDraft = {
  type: string
  title: string
  summary: string
  details: string
  status: "draft" | "published"
}

type MessageDraft = {
  title: string
  content: string
  projectId: string
}

type InvoiceDraft = {
  contractId: string
  title: string
  amount: string
  summary: string
}

type WorkspaceFileRecord = {
  id: string
  label: string
  url: string
  source: "contract" | "update-video" | "workspace-file"
  updatedAt: string | null
  projectId?: string | null
  scope?: string | null
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
  initialTab,
}: {
  clientId?: string | null
  workspaceId: string
  workspaceName?: string
  detail: AdminWorkspaceDetail
  quickEditHref?: string
  quickReposHref?: string
  initialTab?: string
}) {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [deliverables, setDeliverables] = useState<DeliverableRecord[]>([])
  const [repos, setRepos] = useState<RepoRecord[]>([])
  const [suggestions, setSuggestions] = useState<ProjectSuggestionRecord[]>([])
  const [suggestionForms, setSuggestionForms] = useState<SuggestionComposerState>({})
  const [clientSignal, setClientSignal] = useState<ClientSignalRecord | null>(null)
  const [contracts, setContracts] = useState(detail.contracts)
  const [workspaceMessages, setWorkspaceMessages] = useState(detail.messages)
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFileRecord[]>(
    detail.fileReferences.filter((file) => file.source === "workspace-file")
  )
  const [members, setMembers] = useState(detail.members)
  const [updates, setUpdates] = useState(detail.updates)
  const [retainer, setRetainer] = useState(detail.retainer)
  const [retainerSaving, setRetainerSaving] = useState(false)
  const [retainerError, setRetainerError] = useState<string | null>(null)
  const [retainerDraft, setRetainerDraft] = useState({
    poolId: detail.retainer.poolId || "",
    poolName: detail.retainer.poolName || "",
    amountTotal: detail.retainer.amountTotal ? String(detail.retainer.amountTotal) : "",
    currency: detail.retainer.currency || "usd",
    source: detail.retainer.source || "manual",
    active: detail.retainer.active,
  })
  const [contractDraft, setContractDraft] = useState<ContractDraft>({
    title: "",
    type: "scope_of_work",
    status: "draft",
    notes: "",
    file: null,
  })
  const [contractSaving, setContractSaving] = useState(false)
  const [contractError, setContractError] = useState<string | null>(null)
  const [extractingContractId, setExtractingContractId] = useState<string | null>(null)
  const [updateDraft, setUpdateDraft] = useState<UpdateDraft>({
    type: "web",
    title: "",
    summary: "",
    details: "",
    status: "draft",
  })
  const [updateSaving, setUpdateSaving] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [messageDraft, setMessageDraft] = useState<MessageDraft>({
    title: "",
    content: "",
    projectId: "",
  })
  const [messageSaving, setMessageSaving] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft>({
    contractId: detail.contracts[0]?.id || "",
    title: detail.contracts[0] ? `${detail.contracts[0].title} invoice` : "",
    amount: "",
    summary: detail.contracts[0] ? `Invoice derived from ${detail.contracts[0].title}.` : "",
  })
  const [invoiceSaving, setInvoiceSaving] = useState(false)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [archivingMemberId, setArchivingMemberId] = useState<string | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [fileUpload, setFileUpload] = useState<{ title: string; projectId: string; file: File | null }>({
    title: "",
    projectId: "",
    file: null,
  })
  const [fileSaving, setFileSaving] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pulseAudit, setPulseAudit] = useState<PulseAuditState | null>(null)
  const [pulseAuditLoading, setPulseAuditLoading] = useState(false)
  const [pulseAuditError, setPulseAuditError] = useState<string | null>(null)

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
    setSuggestionForms((current) => {
      const next = { ...current }
      for (const suggestion of nextSuggestions) {
        next[suggestion.id] = next[suggestion.id] || {
          status: suggestion.status || "open",
          adminResponse: suggestion.adminResponse || "",
          saving: false,
          error: null,
        }
      }
      return next
    })
    setDeliverables(nextDeliverables)
    setClientSignal(nextClientSignal)
    setLoading(false)
  }

  useEffect(() => {
    void loadWorkspaceMap()
  }, [clientId, workspaceId])

  useEffect(() => {
    setContracts(detail.contracts)
    setWorkspaceMessages(detail.messages)
    setWorkspaceFiles(detail.fileReferences.filter((file) => file.source === "workspace-file"))
    setMembers(detail.members)
    setUpdates(detail.updates)
    setRetainer(detail.retainer)
    setInvoiceDraft({
      contractId: detail.contracts[0]?.id || "",
      title: detail.contracts[0] ? `${detail.contracts[0].title} invoice` : "",
      amount: "",
      summary: detail.contracts[0] ? `Invoice derived from ${detail.contracts[0].title}.` : "",
    })
  }, [detail])

  const visibleDeliverables = useMemo(
    () => deliverables.filter((deliverable) => !deliverable.workspaceId || deliverable.workspaceId === workspaceId),
    [deliverables, workspaceId]
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

  const handleSuggestionField = (suggestionId: string, key: "status" | "adminResponse", value: string) => {
    setSuggestionForms((current) => ({
      ...current,
      [suggestionId]: {
        status: current[suggestionId]?.status || "open",
        adminResponse: current[suggestionId]?.adminResponse || "",
        saving: false,
        error: null,
        [key]: value,
      },
    }))
  }

  const handleSaveSuggestion = async (suggestion: ProjectSuggestionRecord, convertToTask = false) => {
    const form = suggestionForms[suggestion.id] || {
      status: suggestion.status || "open",
      adminResponse: suggestion.adminResponse || "",
      saving: false,
      error: null,
    }
    setSuggestionForms((current) => ({
      ...current,
      [suggestion.id]: { ...form, saving: true, error: null },
    }))
    try {
      const response = await fetch(`/api/admin/project-suggestions/${encodeURIComponent(suggestion.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: form.status,
          adminResponse: form.adminResponse,
          convertToTask,
          workspaceId,
          clientId: clientId || suggestion.clientId || "",
          projectId: suggestion.projectId || "",
          taskTitle: suggestion.projectTitle || suggestion.summary || suggestion.rawText || "Client suggestion follow-up",
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to update suggestion.")
      }
      await loadWorkspaceMap()
    } catch (error) {
      setSuggestionForms((current) => ({
        ...current,
        [suggestion.id]: { ...form, saving: false, error: error instanceof Error ? error.message : "Unable to update suggestion." },
      }))
      return
    }
    setSuggestionForms((current) => ({
      ...current,
      [suggestion.id]: { ...form, saving: false, error: null },
    }))
  }

  const handleSaveRetainer = async () => {
    setRetainerSaving(true)
    setRetainerError(null)
    try {
      const response = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/retainer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || detail.client?.id || "",
          poolId: retainerDraft.poolId,
          poolName: retainerDraft.poolName,
          amountTotal: Number(retainerDraft.amountTotal || 0),
          currency: retainerDraft.currency,
          source: retainerDraft.source,
          active: retainerDraft.active,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to save retainer settings.")
      }
      setRetainer({
        ...retainer,
        exists: true,
        amountTotal: Number(retainerDraft.amountTotal || 0),
        currency: retainerDraft.currency,
        source: retainerDraft.source,
        poolId: retainerDraft.poolId,
        poolName: retainerDraft.poolName || retainerDraft.poolId,
        active: retainerDraft.active,
      })
    } catch (error) {
      setRetainerError(error instanceof Error ? error.message : "Unable to save retainer settings.")
    } finally {
      setRetainerSaving(false)
    }
  }

  const handleCreateContract = async () => {
    if (!clientId || !contractDraft.title.trim()) {
      setContractError("A linked client and contract title are required.")
      return
    }
    setContractSaving(true)
    setContractError(null)
    try {
      const form = new FormData()
      form.set("workspaceId", workspaceId)
      form.set("clientId", clientId)
      form.set("title", contractDraft.title)
      form.set("type", contractDraft.type)
      form.set("status", contractDraft.status)
      form.set("notes", contractDraft.notes)
      if (contractDraft.file) form.set("file", contractDraft.file)

      const response = await fetch("/api/contracts", { method: "POST", body: form })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to create contract.")
      }
      setContracts((current) => [payload.data, ...current])
      setContractDraft({ title: "", type: "scope_of_work", status: "draft", notes: "", file: null })
    } catch (error) {
      setContractError(error instanceof Error ? error.message : "Unable to create contract.")
    } finally {
      setContractSaving(false)
    }
  }

  const handleExtractContract = async (contractId: string, storagePath: string) => {
    setExtractingContractId(contractId)
    setContractError(null)
    try {
      const contract = contracts.find((entry) => entry.id === contractId)
      const response = await fetch("/api/contracts/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId,
          storagePath,
          workspaceId,
          clientId: clientId || null,
          title: contract?.title || workspaceName || contractId,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to extract contract details.")
      }
      setContracts((current) =>
        current.map((entry) =>
          entry.id === contractId
            ? {
                ...entry,
                status: (payload.data?.status as string) || "extracted",
                storagePath,
              }
            : entry
        )
      )
    } catch (error) {
      setContractError(error instanceof Error ? error.message : "Unable to extract contract details.")
    } finally {
      setExtractingContractId(null)
    }
  }

  const handleCreateUpdate = async () => {
    if (!clientId || !updateDraft.title.trim()) {
      setUpdateError("A linked client and update title are required.")
      return
    }
    setUpdateSaving(true)
    setUpdateError(null)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: updateDraft.type,
          title: updateDraft.title,
          summary: updateDraft.summary,
          details: updateDraft.details,
          status: updateDraft.status,
          workspaceId,
          authorKind: "admin",
          authorLabel: "Admin",
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to create update.")
      }
      setUpdates((current) => [
        {
          id: payload.id,
          createdAt: new Date().toISOString(),
          createdByUid: "admin",
          workspaceId,
          authorKind: "admin",
          authorLabel: "Admin",
          type: updateDraft.type as "web" | "app" | "rd" | "housing" | "transportation" | "insurance",
          title: updateDraft.title,
          summary: updateDraft.summary || undefined,
          details: updateDraft.details || undefined,
          body: updateDraft.details || undefined,
          status: updateDraft.status,
        },
        ...current,
      ])
      setUpdateDraft({ type: "web", title: "", summary: "", details: "", status: "draft" })
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Unable to create update.")
    } finally {
      setUpdateSaving(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageDraft.content.trim()) {
      setMessageError("Message content is required.")
      return
    }
    setMessageSaving(true)
    setMessageError(null)
    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || "",
          projectId: messageDraft.projectId || null,
          title: messageDraft.title,
          content: messageDraft.content,
          authorLabel: "Admin",
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to send message.")
      }
      setWorkspaceMessages((current) => [
        {
          id: payload.id,
          title: messageDraft.title || null,
          content: messageDraft.content,
          projectId: messageDraft.projectId || null,
          clientId: clientId || null,
          authorKind: "admin",
          authorLabel: "Admin",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ])
      setMessageDraft({ title: "", content: "", projectId: "" })
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Unable to send message.")
    } finally {
      setMessageSaving(false)
    }
  }

  const handleUploadFile = async () => {
    if (!fileUpload.file) {
      setFileError("Select a file to upload.")
      return
    }
    setFileSaving(true)
    setFileError(null)
    try {
      const form = new FormData()
      form.set("file", fileUpload.file)
      form.set("title", fileUpload.title)
      form.set("projectId", fileUpload.projectId)
      form.set("scope", fileUpload.projectId ? "project" : "workspace")

      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/files`, {
        method: "POST",
        body: form,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to upload file.")
      }
      setWorkspaceFiles((current) => [
        {
          id: payload.id,
          label: fileUpload.title || fileUpload.file?.name || payload.id,
          url: payload.url,
          source: "workspace-file",
          projectId: fileUpload.projectId || null,
          scope: fileUpload.projectId ? "project" : "workspace",
          updatedAt: new Date().toISOString(),
        },
        ...current,
      ])
      setFileUpload({ title: "", projectId: "", file: null })
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Unable to upload file.")
    } finally {
      setFileSaving(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/files/${encodeURIComponent(fileId.replace(/^workspace-file:/, ""))}`, {
        method: "DELETE",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to delete file.")
      }
      setWorkspaceFiles((current) => current.filter((file) => file.id !== fileId))
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Unable to delete file.")
    }
  }

  const handleCreateInvoiceFromContract = async () => {
    if (!clientId || !invoiceDraft.title.trim()) {
      setInvoiceError("A linked client and invoice title are required.")
      return
    }

    setInvoiceSaving(true)
    setInvoiceError(null)
    try {
      const selectedContract = contracts.find((contract) => contract.id === invoiceDraft.contractId)
      const amount = Number(invoiceDraft.amount || 0)
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: invoiceDraft.title,
          amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
          summary:
            invoiceDraft.summary.trim() ||
            (selectedContract ? `Invoice starter created from ${selectedContract.title}.` : "Invoice starter created from workspace contract."),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to create invoice starter.")
      }
      setDeliverables((current) => [payload.data as DeliverableRecord, ...current])
      setInvoiceDraft({
        contractId: selectedContract?.id || contracts[0]?.id || "",
        title: selectedContract ? `${selectedContract.title} invoice` : "",
        amount: "",
        summary: selectedContract ? `Invoice derived from ${selectedContract.title}.` : "",
      })
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : "Unable to create invoice starter.")
    } finally {
      setInvoiceSaving(false)
    }
  }

  const handleArchiveWorkspaceMember = async (memberId: string) => {
    if (!window.confirm("Archive this workspace person if they are no longer linked elsewhere?")) {
      return
    }

    setArchivingMemberId(memberId)
    setTeamError(null)
    try {
      const response = await fetch(
        `/api/admin/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
        { method: "DELETE" }
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Unable to archive workspace person.")
      }
      setMembers((current) => current.filter((member) => member.id !== memberId))
      router.refresh()
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Unable to archive workspace person.")
    } finally {
      setArchivingMemberId(null)
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
          <Tabs defaultValue={initialTab || "suggestions"} className="space-y-4">
            <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              <TabsTrigger value="suggestions"><MessageSquare className="mr-2 h-4 w-4" />Suggestions</TabsTrigger>
              <TabsTrigger value="contracts"><FileText className="mr-2 h-4 w-4" />Contracts</TabsTrigger>
              <TabsTrigger value="invoices"><Wallet className="mr-2 h-4 w-4" />Invoices</TabsTrigger>
              <TabsTrigger value="deliverables"><CheckCircle className="mr-2 h-4 w-4" />Deliverables</TabsTrigger>
              <TabsTrigger value="retainer"><Wallet className="mr-2 h-4 w-4" />Retainer</TabsTrigger>
              <TabsTrigger value="updates"><Video className="mr-2 h-4 w-4" />Updates</TabsTrigger>
              <TabsTrigger value="intake"><FolderOpen className="mr-2 h-4 w-4" />Intake</TabsTrigger>
              <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>
              <TabsTrigger value="messages"><MessageSquare className="mr-2 h-4 w-4" />Messages / Files</TabsTrigger>
              <TabsTrigger value="repos"><Link2 className="mr-2 h-4 w-4" />Repos / Hosting</TabsTrigger>
              <TabsTrigger value="audit"><BarChart3 className="mr-2 h-4 w-4" />Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="suggestions" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Workspace suggestions sourced through `clientFeedback`, with project context preserved here instead of in a separate redundant Projects tab.
                </p>
                <Badge variant="secondary">{suggestions.length}</Badge>
              </div>
              {suggestions.length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No project suggestions are visible for this workspace yet.
                </p>
              ) : (
                suggestions.map((suggestion) => {
                  const form = suggestionForms[suggestion.id] || {
                    status: suggestion.status || "open",
                    adminResponse: suggestion.adminResponse || "",
                    saving: false,
                    error: null,
                  }
                  return (
                  <div key={suggestion.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(suggestion.status)}`}>
                          {suggestion.status || "open"}
                        </span>
                        {suggestion.urgency ? <Badge variant="outline">{suggestion.urgency}</Badge> : null}
                        {suggestion.projectTitle ? <Badge variant="secondary">{suggestion.projectTitle}</Badge> : null}
                        {suggestion.projectId ? <Badge variant="outline">{suggestion.projectId}</Badge> : null}
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
                    <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
                      <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Status
                        <select
                          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={form.status}
                          onChange={(event) => handleSuggestionField(suggestion.id, "status", event.target.value)}
                        >
                          {["open", "acknowledged", "accepted", "in_progress", "declined", "done"].map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Admin response
                        <Textarea
                          className="mt-2 min-h-[96px]"
                          value={form.adminResponse}
                          onChange={(event) => handleSuggestionField(suggestion.id, "adminResponse", event.target.value)}
                          placeholder="Add admin context or the next action visible to this workspace."
                        />
                      </label>
                    </div>
                    {suggestion.taskId ? (
                      <p className="mt-3 text-xs text-muted-foreground">Linked task: {suggestion.taskId}</p>
                    ) : null}
                    {form.error ? <p className="mt-3 text-sm text-rose-600">{form.error}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void handleSaveSuggestion(suggestion)} disabled={form.saving}>
                        {form.saving ? "Saving..." : "Save suggestion"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void handleSaveSuggestion(suggestion, true)} disabled={form.saving}>
                        Convert to task
                      </Button>
                    </div>
                  </div>
                )})
              )}
            </TabsContent>

            <TabsContent value="contracts" className="space-y-3">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Create contract or scope record</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input
                    value={contractDraft.title}
                    onChange={(event) => setContractDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Statement of work"
                  />
                  <Input
                    value={contractDraft.type}
                    onChange={(event) => setContractDraft((current) => ({ ...current, type: event.target.value }))}
                    placeholder="scope_of_work"
                  />
                  <Input
                    value={contractDraft.status}
                    onChange={(event) => setContractDraft((current) => ({ ...current, status: event.target.value }))}
                    placeholder="draft"
                  />
                  <Input
                    type="file"
                    onChange={(event) => setContractDraft((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                  />
                </div>
                <Textarea
                  className="mt-3 min-h-[96px]"
                  value={contractDraft.notes}
                  onChange={(event) => setContractDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Scope notes or agreement context."
                />
                {contractError ? <p className="mt-3 text-sm text-rose-600">{contractError}</p> : null}
                <Button className="mt-3" onClick={() => void handleCreateContract()} disabled={contractSaving}>
                  {contractSaving ? "Saving..." : "Create contract"}
                </Button>
              </div>
              {contracts.length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No contract records are linked to this workspace yet.
                </p>
              ) : (
                contracts.map((contract) => (
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
                      {contract.storagePath ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleExtractContract(contract.id, contract.storagePath as string)}
                          disabled={extractingContractId === contract.id}
                        >
                          {extractingContractId === contract.id ? "Extracting..." : contract.status === "extracted" ? "Re-extract" : "Extract details"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="invoices" className="space-y-3">
              <WorkspaceInvoicesPanel
                clientId={detail.client?.id || detail.workspace.clientId}
                workspaceId={workspaceId}
                contracts={contracts.map((contract) => ({
                  id: contract.id,
                  title: contract.title,
                }))}
                defaultBillTo={{
                  name: detail.client?.name || detail.workspace.name || "",
                  company: detail.client?.name || detail.workspace.name || "",
                  address: "",
                  email:
                    detail.client?.contactEmail ||
                    detail.client?.portalEmail ||
                    detail.workspace.clientEmail ||
                    "",
                }}
              />
            </TabsContent>

            <TabsContent value="deliverables" className="space-y-3">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Create invoice from contract</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Starter flow only. This creates a pending client deliverable invoice from the selected contract without changing contract records.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={invoiceDraft.contractId}
                    onChange={(event) => {
                      const contract = contracts.find((entry) => entry.id === event.target.value)
                      setInvoiceDraft((current) => ({
                        ...current,
                        contractId: event.target.value,
                        title: current.title || (contract ? `${contract.title} invoice` : ""),
                        summary: current.summary || (contract ? `Invoice derived from ${contract.title}.` : ""),
                      }))
                    }}
                  >
                    <option value="">No contract selected</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.title}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={invoiceDraft.amount}
                    onChange={(event) => setInvoiceDraft((current) => ({ ...current, amount: event.target.value }))}
                    inputMode="decimal"
                    placeholder="Amount"
                  />
                  <Input
                    value={invoiceDraft.title}
                    onChange={(event) => setInvoiceDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Invoice title"
                  />
                  <Input
                    value={invoiceDraft.summary}
                    onChange={(event) => setInvoiceDraft((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Invoice summary"
                  />
                </div>
                {invoiceError ? <p className="mt-3 text-sm text-rose-600">{invoiceError}</p> : null}
                <Button className="mt-3" onClick={() => void handleCreateInvoiceFromContract()} disabled={invoiceSaving}>
                  {invoiceSaving ? "Creating..." : "Create invoice starter"}
                </Button>
              </div>
              {visibleDeliverables.length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">No deliverables found.</p>
              ) : (
                visibleDeliverables.map((deliverable) => (
                  <div key={deliverable.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{deliverable.title || deliverable.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {deliverable.summary || deliverable.projectId || "Workspace deliverable"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {deliverable.workspaceId ? "Workspace-linked" : "Client-level record"}
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
              ) : (
                <>
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Retainer configuration</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <Input value={retainerDraft.poolId} onChange={(event) => setRetainerDraft((current) => ({ ...current, poolId: event.target.value }))} placeholder="pool id" />
                    <Input value={retainerDraft.poolName} onChange={(event) => setRetainerDraft((current) => ({ ...current, poolName: event.target.value }))} placeholder="pool name" />
                    <Input value={retainerDraft.amountTotal} onChange={(event) => setRetainerDraft((current) => ({ ...current, amountTotal: event.target.value }))} placeholder="3000" />
                    <Input value={retainerDraft.currency} onChange={(event) => setRetainerDraft((current) => ({ ...current, currency: event.target.value }))} placeholder="usd" />
                    <Input value={retainerDraft.source} onChange={(event) => setRetainerDraft((current) => ({ ...current, source: event.target.value }))} placeholder="manual" />
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={retainerDraft.active}
                      onChange={(event) => setRetainerDraft((current) => ({ ...current, active: event.target.checked }))}
                    />
                    Active retainer
                  </label>
                  {retainerError ? <p className="mt-3 text-sm text-rose-600">{retainerError}</p> : null}
                  <Button className="mt-3" onClick={() => void handleSaveRetainer()} disabled={retainerSaving}>
                    {retainerSaving ? "Saving..." : retainer.exists ? "Update retainer" : "Link retainer"}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ledger editing remains on the finance layer. This tab updates the canonical client retainer linkage and pooled wallet reference only.
                  </p>
                </div>
                {retainer.exists ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Committed</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCurrency(retainer.amountTotal ?? 0, retainer.currency ?? "usd")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{retainer.active ? "Active" : "Inactive"} · {retainer.source || "manual"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Received</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCurrency(retainer.totalReceived, retainer.currency ?? "usd")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{retainer.contributionCount} contribution{retainer.contributionCount === 1 ? "" : "s"} · client-level pool record</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pool allocated</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCurrency(retainer.totalAllocated, retainer.currency ?? "usd")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{retainer.allocationCount} pool allocation{retainer.allocationCount === 1 ? "" : "s"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pool linkage</p>
                    <p className="mt-2 text-lg font-semibold">{retainer.poolName || retainer.poolId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Latest contribution: {retainer.latestContributionAt ? formatDateTime(retainer.latestContributionAt) : "None"}
                    </p>
                  </div>
                </div> : null}
                </>
              )}
            </TabsContent>

            <TabsContent value="updates" className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Post admin update</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input value={updateDraft.type} onChange={(event) => setUpdateDraft((current) => ({ ...current, type: event.target.value }))} placeholder="web" />
                  <Input value={updateDraft.title} onChange={(event) => setUpdateDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Update title" />
                </div>
                <Input className="mt-3" value={updateDraft.summary} onChange={(event) => setUpdateDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="Short summary" />
                <Textarea className="mt-3 min-h-[110px]" value={updateDraft.details} onChange={(event) => setUpdateDraft((current) => ({ ...current, details: event.target.value }))} placeholder="Workspace-scoped update details" />
                {updateError ? <p className="mt-3 text-sm text-rose-600">{updateError}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => void handleCreateUpdate()} disabled={updateSaving}>{updateSaving ? "Posting..." : "Create draft update"}</Button>
                  <Button variant="outline" onClick={() => setUpdateDraft((current) => ({ ...current, status: current.status === "draft" ? "published" : "draft" }))}>
                    Status: {updateDraft.status}
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Client updates feed</p>
                    <Badge variant="secondary">{updates.length}</Badge>
                  </div>
                  {updates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No client updates recorded yet.</p>
                  ) : (
                    updates.map((update) => (
                      <div key={update.id} className="rounded bg-muted p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{update.title}</p>
                          <Badge className={statusTone(update.status)}>{update.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(update.createdAt)} · {update.type} · {update.workspaceId ? "workspace-scoped" : "client-level"}{update.authorKind ? ` · ${update.authorKind}` : ""}
                        </p>
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
              <div className="rounded-lg border p-4">
                <p className="font-medium">Intake sender</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use an active questionnaire to push intake into the client workspace. Draft questionnaires stay internal; switching one to active sends it to the client-side Intake tab.
                </p>
              </div>
              <WorkspaceQuestionnairesPanel workspaceId={workspaceId} workspaceName={workspaceName || workspaceId} />
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Active members</p>
                    <Badge variant="secondary">{members.length}</Badge>
                  </div>
                  {teamError ? <p className="mt-3 text-sm text-rose-600">{teamError}</p> : null}
                  <div className="mt-3 space-y-2">
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No workspace members found.</p>
                    ) : (
                      members.map((member) => (
                        <div key={member.id} className="rounded bg-muted px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{member.displayName || member.email || member.id}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.role || "No role"} · {member.status || "unknown"} · {member.source || "manual"}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleArchiveWorkspaceMember(member.id)}
                              disabled={archivingMemberId === member.id}
                            >
                              {archivingMemberId === member.id ? "Archiving..." : "Archive"}
                            </Button>
                          </div>
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
              <div className="rounded-lg border p-4">
                <p className="font-medium">Admin composer</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input value={messageDraft.title} onChange={(event) => setMessageDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Message title" />
                  <Input value={messageDraft.projectId} onChange={(event) => setMessageDraft((current) => ({ ...current, projectId: event.target.value }))} placeholder="Optional project id" />
                </div>
                <Textarea className="mt-3 min-h-[110px]" value={messageDraft.content} onChange={(event) => setMessageDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Post a workspace message from admin." />
                {messageError ? <p className="mt-3 text-sm text-rose-600">{messageError}</p> : null}
                <Button className="mt-3" onClick={() => void handleSendMessage()} disabled={messageSaving}>
                  {messageSaving ? "Sending..." : "Post message"}
                </Button>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium">Upload workspace file</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Input value={fileUpload.title} onChange={(event) => setFileUpload((current) => ({ ...current, title: event.target.value }))} placeholder="File label" />
                  <Input value={fileUpload.projectId} onChange={(event) => setFileUpload((current) => ({ ...current, projectId: event.target.value }))} placeholder="Optional project id" />
                  <Input type="file" onChange={(event) => setFileUpload((current) => ({ ...current, file: event.target.files?.[0] || null }))} />
                </div>
                {fileError ? <p className="mt-3 text-sm text-rose-600">{fileError}</p> : null}
                <Button className="mt-3" onClick={() => void handleUploadFile()} disabled={fileSaving}>
                  {fileSaving ? "Uploading..." : "Upload file"}
                </Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Workspace message thread</p>
                    <Badge variant="secondary">{workspaceMessages.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {workspaceMessages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No workspace-authored messages yet.</p>
                    ) : (
                      workspaceMessages.map((message) => (
                        <div key={message.id} className="rounded bg-muted px-3 py-2">
                          <p className="font-medium">{message.title || "Untitled message"}</p>
                          <p className="text-xs text-muted-foreground">
                            {message.authorLabel || message.authorKind || "admin"} · {formatDateTime(message.createdAt)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{message.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                  <Badge variant="secondary">{detail.fileReferences.length + workspaceFiles.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {detail.fileReferences.length === 0 && workspaceFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No canonical file references are exposed for this workspace yet.</p>
                  ) : (
                    <>
                      {workspaceFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between rounded bg-muted px-3 py-2 text-sm">
                          <a href={file.url} target="_blank" rel="noreferrer" className="hover:underline">{file.label}</a>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{file.scope || file.source}</span>
                            <Button size="sm" variant="ghost" onClick={() => void handleDeleteFile(file.id)}>Remove</Button>
                          </div>
                        </div>
                      ))}
                      {detail.fileReferences.filter((file) => file.source !== "workspace-file").map((file) => (
                        <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded bg-muted px-3 py-2 text-sm hover:underline">
                          <span>{file.label}</span>
                          <span className="text-xs text-muted-foreground">{file.scope || file.source}</span>
                        </a>
                      ))}
                    </>
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
              <div className="grid gap-4 md:grid-cols-5">
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

    </>
  )
}
