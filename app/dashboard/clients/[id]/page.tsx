"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import DashboardLayout from "@/components/dashboard-layout"
import {
  ArrowLeft,
  Brain,
  Plus,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  ExternalLink,
  Edit,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ClientDirectoryEntry, ClientStatus, DeployStatus, StripeStatus } from "@/lib/client-directory"
import type { ClientUpdate, ModuleKey, UpdateStatus } from "@/lib/client-directory"
import type { ClientRoleSuggestionSnapshot } from "@/lib/client-role-suggestions"
import { getClientPreferredProductionUrl } from "@/lib/vercel"
import type {
  ClientWorkspace,
  ClientWorkspaceAction,
  ClientWorkspaceActionStatus,
  ClientWorkspaceCanvasBlock,
  ClientWorkspaceCanvasKind,
  ClientWorkspaceHealth,
  ClientWorkspaceNote,
  ClientWorkspaceNoteKind,
  ClientWorkspacePhase,
  ClientWorkspacePriority,
} from "@/lib/client-workspace"

const MODULE_TYPES: { value: ModuleKey; label: string }[] = [
  { value: "web", label: "Website" },
  { value: "app", label: "App" },
  { value: "rd", label: "R&D" },
  { value: "housing", label: "Housing" },
  { value: "transportation", label: "Transportation" },
  { value: "insurance", label: "Insurance" },
]

interface BeamDirectoryEntry {
  id: string
  label: string
  title: string
  subtitle: string
  url: string
  previewImageUrl: string
  sortOrder: number
  isActive: boolean
  createdBy: string
  updatedBy: string
  source: string
}

const WORKSPACE_PHASE_OPTIONS: Array<{ value: ClientWorkspacePhase; label: string }> = [
  { value: "discovery", label: "Discovery" },
  { value: "planning", label: "Planning" },
  { value: "building", label: "Building" },
  { value: "launching", label: "Launching" },
  { value: "support", label: "Support" },
]

const WORKSPACE_HEALTH_OPTIONS: Array<{ value: ClientWorkspaceHealth; label: string }> = [
  { value: "on_track", label: "On Track" },
  { value: "watch", label: "Watch" },
  { value: "blocked", label: "Blocked" },
]

const WORKSPACE_NOTE_KIND_OPTIONS: Array<{ value: ClientWorkspaceNoteKind; label: string }> = [
  { value: "general", label: "General" },
  { value: "decision", label: "Decision" },
  { value: "meeting", label: "Meeting" },
  { value: "pulse", label: "Pulse" },
]

const WORKSPACE_ACTION_STATUS_OPTIONS: Array<{ value: ClientWorkspaceActionStatus; label: string }> = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
]

const WORKSPACE_PRIORITY_OPTIONS: Array<{ value: ClientWorkspacePriority; label: string }> = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

const WORKSPACE_CANVAS_KIND_OPTIONS: Array<{ value: ClientWorkspaceCanvasKind; label: string }> = [
  { value: "objective", label: "Objective" },
  { value: "status", label: "Status" },
  { value: "scope", label: "Scope" },
  { value: "risks", label: "Risks" },
  { value: "next_steps", label: "Next Steps" },
  { value: "custom", label: "Custom" },
]

function createWorkspaceItemId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function createEmptyWorkspaceNote(): ClientWorkspaceNote {
  const timestamp = nowIso()
  return {
    id: createWorkspaceItemId("note"),
    title: "",
    body: "",
    kind: "general",
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createEmptyWorkspaceAction(): ClientWorkspaceAction {
  const timestamp = nowIso()
  return {
    id: createWorkspaceItemId("action"),
    title: "",
    detail: "",
    status: "todo",
    priority: "medium",
    owner: "",
    dueDate: "",
    source: "manual",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createEmptyWorkspaceCanvasBlock(): ClientWorkspaceCanvasBlock {
  return {
    id: createWorkspaceItemId("canvas"),
    title: "New Block",
    content: "",
    kind: "custom",
  }
}

function formatTimestamp(value?: string): string {
  if (!value) return "Not saved yet"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function sanitizeWorkspaceForSave(workspace: ClientWorkspace): ClientWorkspace {
  const timestamp = nowIso()

  return {
    ...workspace,
    currentFocus: workspace.currentFocus.trim(),
    summary: workspace.summary.trim(),
    notes: workspace.notes
      .filter((note) => note.title.trim() || note.body.trim())
      .map((note) => ({
        ...note,
        title: note.title.trim() || "Untitled note",
        body: note.body.trim(),
        updatedAt: timestamp,
      })),
    actions: workspace.actions
      .filter(
        (action) =>
          action.title.trim() ||
          (action.detail ?? "").trim() ||
          (action.owner ?? "").trim() ||
          (action.dueDate ?? "").trim()
      )
      .map((action) => ({
        ...action,
        title: action.title.trim() || "Untitled action",
        detail: action.detail?.trim() || undefined,
        owner: action.owner?.trim() || undefined,
        dueDate: action.dueDate?.trim() || undefined,
        source: action.source?.trim() || undefined,
        updatedAt: timestamp,
      })),
    canvas: workspace.canvas
      .filter((block) => block.title.trim() || block.content.trim())
      .map((block) => ({
        ...block,
        title: block.title.trim() || "Untitled block",
        content: block.content.trim(),
      })),
    updatedAt: timestamp,
  }
}

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const [client, setClient] = useState<ClientDirectoryEntry | null>(null)
  const [updates, setUpdates] = useState<ClientUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [videoUploading, setVideoUploading] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: "web" as ModuleKey,
    title: "",
    summary: "",
    details: "",
    status: "draft" as UpdateStatus,
  })
  const [editForm, setEditForm] = useState({
    name: '',
    storyId: '',
    brands: [] as string[],
    status: 'onboarding' as ClientStatus,
    deployStatus: 'building' as DeployStatus,
    deployUrl: '',
    stripeStatus: 'pending' as StripeStatus,
    revenue: 0,
    meetings: 0,
    emails: 0,
    commits: 0,
    lastActivity: '',
    pulseSummary: '',
    websiteUrl: '',
    githubRepo: '',
    githubReposCsv: '',
    deployHostsCsv: '',
    appUrl: '',
    appStoreUrl: '',
    rdUrl: '',
    housingUrl: '',
    transportationUrl: '',
    insuranceUrl: '',
    storyVideoUrl: '',
    showOnFrontend: true,
    isNewStory: false,
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [generatingPulse, setGeneratingPulse] = useState(false)
  const [syncingVercel, setSyncingVercel] = useState(false)
  const [roleSuggestionSnapshot, setRoleSuggestionSnapshot] = useState<ClientRoleSuggestionSnapshot | null>(null)
  const [generatingRoleSuggestions, setGeneratingRoleSuggestions] = useState(false)
  const [updatingRoleStatusId, setUpdatingRoleStatusId] = useState<string | null>(null)
  const [beamEntries, setBeamEntries] = useState<BeamDirectoryEntry[]>([])
  const [beamLoading, setBeamLoading] = useState(false)
  const [beamError, setBeamError] = useState<string | null>(null)
  const [selectedBeamEntryId, setSelectedBeamEntryId] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<ClientWorkspace | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceSaving, setWorkspaceSaving] = useState(false)
  const [workspaceDirty, setWorkspaceDirty] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  const fetchClient = () => {
    if (!clientId) return
    setLoading(true)
    fetch(`/api/clients/${encodeURIComponent(clientId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.client) {
          setClient(data.client)
          setRoleSuggestionSnapshot(data.client.roleSuggestionSnapshot || null)
          // Initialize edit form with client data
          setEditForm({
            name: data.client.name,
            storyId: data.client.storyId,
            brands: data.client.brands || [],
            status: data.client.status,
            deployStatus: data.client.deployStatus,
            deployUrl: data.client.deployUrl || '',
            stripeStatus: data.client.stripeStatus,
            revenue: data.client.revenue || 0,
            meetings: data.client.meetings || 0,
            emails: data.client.emails || 0,
            commits: data.client.commits || 0,
            lastActivity: data.client.lastActivity || '',
            pulseSummary: data.client.pulseSummary || '',
            websiteUrl: data.client.websiteUrl || '',
            githubRepo: data.client.githubRepo || '',
            githubReposCsv: Array.isArray(data.client.githubRepos) ? data.client.githubRepos.join(', ') : '',
            deployHostsCsv: Array.isArray(data.client.deployHosts) ? data.client.deployHosts.join(', ') : '',
            appUrl: data.client.appUrl || '',
            appStoreUrl: data.client.appStoreUrl || '',
            rdUrl: data.client.rdUrl || '',
            housingUrl: data.client.housingUrl || '',
            transportationUrl: data.client.transportationUrl || '',
            insuranceUrl: data.client.insuranceUrl || '',
            storyVideoUrl: data.client.storyVideoUrl || '',
            showOnFrontend: data.client.showOnFrontend !== false,
            isNewStory: data.client.isNewStory || false,
          })
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    fetchClient()
    return () => {
      cancelled = true
    }
  }, [clientId])

  const fetchUpdates = () => {
    if (!clientId) return
    setUpdatesLoading(true)
    fetch(`/api/clients/${encodeURIComponent(clientId)}/updates?limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.updates)) setUpdates(data.updates)
      })
      .finally(() => setUpdatesLoading(false))
  }

  const fetchWorkspace = () => {
    if (!clientId) return
    setWorkspaceLoading(true)
    setWorkspaceError(null)
    fetch(`/api/clients/${encodeURIComponent(clientId)}/workspace`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.workspace) {
          setWorkspace(data.workspace)
          setWorkspaceDirty(false)
          return
        }
        setWorkspaceError(data?.error || "Unable to load workspace right now.")
      })
      .catch(() => {
        setWorkspaceError("Unable to load workspace right now.")
      })
      .finally(() => setWorkspaceLoading(false))
  }

  useEffect(() => {
    if (!clientId) return
    fetchUpdates()
  }, [clientId])

  useEffect(() => {
    if (!clientId) return
    fetchWorkspace()
  }, [clientId])

  useEffect(() => {
    let cancelled = false
    setBeamLoading(true)
    setBeamError(null)

    fetch("/api/beam/website-directory/internal", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const entries = Array.isArray(data?.entries) ? (data.entries as BeamDirectoryEntry[]) : []
        setBeamEntries(entries)
        if (!data?.success) {
          setBeamError(data?.error || "Unable to sync BEAM sites right now.")
        }
      })
      .catch(() => {
        if (cancelled) return
        setBeamEntries([])
        setBeamError("Unable to sync BEAM sites right now.")
      })
      .finally(() => {
        if (!cancelled) setBeamLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (beamEntries.length === 0) {
      setSelectedBeamEntryId(null)
      return
    }
    if (!selectedBeamEntryId || !beamEntries.some((entry) => entry.id === selectedBeamEntryId)) {
      setSelectedBeamEntryId(beamEntries[0].id)
    }
  }, [beamEntries, selectedBeamEntryId])

  const handleCreateUpdate = async () => {
    if (!form.title.trim()) return
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          summary: form.summary.trim() || undefined,
          details: form.details.trim() || undefined,
          status: form.status,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create")
      setAddDialogOpen(false)
      setForm({ type: "web", title: "", summary: "", details: "", status: "draft" })
      fetchUpdates()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Failed to create update")
    }
  }

  const handlePublish = async (updateId: string) => {
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/updates/${encodeURIComponent(updateId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        }
      )
      if (!res.ok) throw new Error("Failed to publish")
      fetchUpdates()
    } catch (e) {
      console.error(e)
      alert("Failed to publish")
    }
  }

  const handleVideoUpload = async (updateId: string, file: File) => {
    setVideoUploading(updateId)
    try {
      const formData = new FormData()
      formData.append("video", file)
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/updates/${encodeURIComponent(updateId)}/video`,
        { method: "POST", body: formData }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Upload failed")
      fetchUpdates()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setVideoUploading(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!clientId) return
    const storyVideoUrl = editForm.storyVideoUrl.trim()
    if (!storyVideoUrl) {
      alert('Story Video URL is required')
      return
    }
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          storyId: editForm.storyId.trim(),
          brands: editForm.brands,
          status: editForm.status,
          deployStatus: editForm.deployStatus,
          deployUrl: editForm.deployUrl.trim() || undefined,
          stripeStatus: editForm.stripeStatus,
          revenue: editForm.revenue,
          meetings: editForm.meetings,
          emails: editForm.emails,
          commits: editForm.commits,
          lastActivity: editForm.lastActivity.trim() || new Date().toISOString(),
          pulseSummary: editForm.pulseSummary.trim() || undefined,
          websiteUrl: editForm.websiteUrl.trim() || undefined,
          githubRepo: editForm.githubRepo.trim() || undefined,
          githubRepos: editForm.githubReposCsv
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          deployHosts: editForm.deployHostsCsv
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          appUrl: editForm.appUrl.trim() || undefined,
          appStoreUrl: editForm.appStoreUrl.trim() || undefined,
          rdUrl: editForm.rdUrl.trim() || undefined,
          housingUrl: editForm.housingUrl.trim() || undefined,
          transportationUrl: editForm.transportationUrl.trim() || undefined,
          insuranceUrl: editForm.insuranceUrl.trim() || undefined,
          storyVideoUrl,
          showOnFrontend: editForm.showOnFrontend,
          isNewStory: editForm.isNewStory,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update client')
      setEditDialogOpen(false)
      fetchClient() // Refresh client data
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to update client')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleGeneratePulseSummary = async () => {
    if (!clientId) return
    setGeneratingPulse(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/pulse-suggestions`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to generate pulse summary")
      const suggestions: string[] = Array.isArray(data.suggestions) ? data.suggestions : []
      const combined = [data.summary, ...suggestions.map((s) => `- ${s}`)].filter(Boolean).join("\n")
      setEditForm((prev) => ({ ...prev, pulseSummary: combined }))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate pulse summary")
    } finally {
      setGeneratingPulse(false)
    }
  }

  const handleSyncFromVercel = async () => {
    if (!clientId) return
    setSyncingVercel(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/sync-vercel`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to sync from Vercel")
      fetchClient()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to sync from Vercel")
    } finally {
      setSyncingVercel(false)
    }
  }

  const handleGenerateRoleSuggestions = async () => {
    if (!clientId) return
    setGeneratingRoleSuggestions(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/role-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshPulse: true }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to generate role suggestions")
      setRoleSuggestionSnapshot(data.roleSuggestionSnapshot || null)
      fetchClient()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate role suggestions")
    } finally {
      setGeneratingRoleSuggestions(false)
    }
  }

  const handleUpdateRoleSuggestionStatus = async (
    suggestionId: string,
    status: "suggested" | "shortlisted" | "approved" | "rejected"
  ) => {
    if (!clientId) return
    setUpdatingRoleStatusId(suggestionId)
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/role-suggestions/${encodeURIComponent(suggestionId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      )
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to update role suggestion")
      setRoleSuggestionSnapshot(data.roleSuggestionSnapshot || null)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update role suggestion")
    } finally {
      setUpdatingRoleStatusId(null)
    }
  }

  const updateWorkspace = (updater: (current: ClientWorkspace) => ClientWorkspace) => {
    setWorkspace((current) => {
      if (!current) return current
      return updater(current)
    })
    setWorkspaceDirty(true)
  }

  const handleSaveWorkspace = async () => {
    if (!clientId || !workspace) return
    setWorkspaceSaving(true)
    try {
      const payload = sanitizeWorkspaceForSave(workspace)
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/workspace`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: payload }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to save workspace")
      setWorkspace(data.workspace || payload)
      setWorkspaceDirty(false)
      setWorkspaceError(null)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Failed to save workspace")
    } finally {
      setWorkspaceSaving(false)
    }
  }

  const handleAddWorkspaceNote = () => {
    updateWorkspace((current) => ({
      ...current,
      notes: [createEmptyWorkspaceNote(), ...current.notes],
    }))
  }

  const handleUpdateWorkspaceNote = (
    noteId: string,
    patch: Partial<Omit<ClientWorkspaceNote, "id" | "createdAt">>
  ) => {
    updateWorkspace((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              ...patch,
              updatedAt: nowIso(),
            }
          : note
      ),
    }))
  }

  const handleRemoveWorkspaceNote = (noteId: string) => {
    updateWorkspace((current) => ({
      ...current,
      notes: current.notes.filter((note) => note.id !== noteId),
    }))
  }

  const handleAddWorkspaceAction = () => {
    updateWorkspace((current) => ({
      ...current,
      actions: [createEmptyWorkspaceAction(), ...current.actions],
    }))
  }

  const handleUpdateWorkspaceAction = (
    actionId: string,
    patch: Partial<Omit<ClientWorkspaceAction, "id" | "createdAt">>
  ) => {
    updateWorkspace((current) => ({
      ...current,
      actions: current.actions.map((action) =>
        action.id === actionId
          ? {
              ...action,
              ...patch,
              updatedAt: nowIso(),
            }
          : action
      ),
    }))
  }

  const handleRemoveWorkspaceAction = (actionId: string) => {
    updateWorkspace((current) => ({
      ...current,
      actions: current.actions.filter((action) => action.id !== actionId),
    }))
  }

  const handleAddCanvasBlock = () => {
    updateWorkspace((current) => ({
      ...current,
      canvas: [...current.canvas, createEmptyWorkspaceCanvasBlock()],
    }))
  }

  const handleUpdateCanvasBlock = (
    blockId: string,
    patch: Partial<Omit<ClientWorkspaceCanvasBlock, "id">>
  ) => {
    updateWorkspace((current) => ({
      ...current,
      canvas: current.canvas.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...patch,
            }
          : block
      ),
    }))
  }

  const handleRemoveCanvasBlock = (blockId: string) => {
    updateWorkspace((current) => ({
      ...current,
      canvas: current.canvas.filter((block) => block.id !== blockId),
    }))
  }

  if (loading || !client) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-pulse text-muted-foreground">Loading…</div>
        </div>
      </DashboardLayout>
    )
  }

  const selectedBeamEntry = beamEntries.find((entry) => entry.id === selectedBeamEntryId) || null
  const preferredProductionUrl = getClientPreferredProductionUrl(client)
  const workspaceActionCounts = workspace
    ? {
        open: workspace.actions.filter((action) => action.status !== "done").length,
        blocked: workspace.actions.filter((action) => action.status === "blocked").length,
        done: workspace.actions.filter((action) => action.status === "done").length,
      }
    : null
  const pulseWorkItemCount = client.pulseReport?.workItems?.length ?? 0
  const activeRoleSuggestionCount =
    roleSuggestionSnapshot?.roleSuggestions.filter((suggestion) => suggestion.status !== "rejected").length ?? 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/clients">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
              <p className="text-sm text-muted-foreground">
                {client.storyId} · {client.status}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSyncFromVercel}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync from Vercel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="roles">Role Suggestions</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Story ID:</strong> {client.storyId}</p>
                <p><strong>Status:</strong> {client.status}</p>
                <p><strong>Last activity:</strong> {client.lastActivity}</p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={handleSyncFromVercel} disabled={syncingVercel}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncingVercel ? "animate-spin" : ""}`} />
                    {syncingVercel ? "Syncing…" : "Sync from Vercel"}
                  </Button>
                </div>
                {preferredProductionUrl && (
                  <a
                    href={preferredProductionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" /> Deploy URL
                  </a>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>App Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.appStoreConnectAppId || client.appUrl || client.appStoreUrl ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked App</p>
                        <p className="mt-1 text-sm text-foreground">
                          {client.appStoreConnectName || client.appStoreConnectBundleId || "Manual app link only"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest Build</p>
                        <p className="mt-1 text-sm text-foreground">
                          {client.appStoreConnectVersionString || "?"} ({client.appStoreConnectBuildNumber || "?"})
                          {client.appStoreConnectBuildState ? ` · ${client.appStoreConnectBuildState}` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Bundle ID</p>
                        <p className="mt-1 text-sm text-foreground">{client.appStoreConnectBundleId || "Not linked yet"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">TestFlight Groups</p>
                        <p className="mt-1 text-sm text-foreground">
                          {client.appStoreConnectBetaGroups && client.appStoreConnectBetaGroups.length > 0
                            ? client.appStoreConnectBetaGroups.join(", ")
                            : "No beta groups detected"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {client.appStoreUrl ? (
                        <a
                          href={client.appStoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" /> App Store URL
                        </a>
                      ) : null}
                      {client.appUrl ? (
                        <a
                          href={client.appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" /> App URL
                        </a>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No App Store Connect app is linked to this client yet.
                  </p>
                )}

                <Button variant="outline" asChild size="sm">
                  <Link href="/dashboard/web-development/app-store-sync">Open App Store Sync</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  BEAM Home Sites
                  <Badge className="bg-cyan-700 text-white">Read-only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Internal BEAM directory sync for site switching. Existing client data remains unchanged.
                </p>

                {beamError && (
                  <p className="text-sm text-amber-600">{beamError}</p>
                )}

                {beamLoading ? (
                  <p className="text-sm text-muted-foreground">Loading BEAM sites…</p>
                ) : beamEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No BEAM sites available yet.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Site Switch</p>
                      {beamEntries.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setSelectedBeamEntryId(entry.id)}
                          className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                            selectedBeamEntryId === entry.id
                              ? "bg-cyan-50 border-cyan-300 text-cyan-900"
                              : "bg-background border-border hover:border-cyan-200"
                          }`}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                    <div className="lg:col-span-2">
                      {selectedBeamEntry && (
                        <div className="border rounded-lg overflow-hidden bg-card">
                          {selectedBeamEntry.previewImageUrl ? (
                            <img
                              src={selectedBeamEntry.previewImageUrl}
                              alt={selectedBeamEntry.title}
                              className="w-full h-44 object-cover"
                            />
                          ) : (
                            <div className="w-full h-44 bg-muted flex items-center justify-center text-sm text-muted-foreground">
                              No preview image
                            </div>
                          )}
                          <div className="p-4">
                            <p className="font-semibold">{selectedBeamEntry.title}</p>
                            {selectedBeamEntry.subtitle && (
                              <p className="text-sm text-muted-foreground mt-1">{selectedBeamEntry.subtitle}</p>
                            )}
                            <a
                              href={selectedBeamEntry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-4 text-cyan-700 hover:text-cyan-800 font-medium"
                            >
                              Visit Site
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="workspace" className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Client Workspace</h2>
                <p className="text-sm text-muted-foreground">
                  Internal working area for notes, delivery actions, and a live client canvas that Pulse can build on.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchWorkspace}
                  disabled={workspaceLoading || workspaceSaving}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${workspaceLoading ? "animate-spin" : ""}`} />
                  Reload
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveWorkspace}
                  disabled={!workspace || workspaceSaving || workspaceLoading || !workspaceDirty}
                >
                  {workspaceSaving ? "Saving…" : workspaceDirty ? "Save workspace" : "Saved"}
                </Button>
              </div>
            </div>

            {workspaceError ? (
              <Card>
                <CardContent className="py-6 text-sm text-amber-600">{workspaceError}</CardContent>
              </Card>
            ) : null}

            {workspaceLoading && !workspace ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">Loading workspace…</CardContent>
              </Card>
            ) : workspace ? (
              <>
                <div className="grid gap-4 xl:grid-cols-3">
                  <Card className="xl:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Workspace State</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="mb-2 block">Phase</Label>
                          <Select
                            value={workspace.phase}
                            onValueChange={(value) =>
                              updateWorkspace((current) => ({
                                ...current,
                                phase: value as ClientWorkspacePhase,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WORKSPACE_PHASE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="mb-2 block">Health</Label>
                          <Select
                            value={workspace.health}
                            onValueChange={(value) =>
                              updateWorkspace((current) => ({
                                ...current,
                                health: value as ClientWorkspaceHealth,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WORKSPACE_HEALTH_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block">Current Focus</Label>
                        <Textarea
                          value={workspace.currentFocus}
                          onChange={(e) =>
                            updateWorkspace((current) => ({
                              ...current,
                              currentFocus: e.target.value,
                            }))
                          }
                          placeholder="What is Pulse actively tracking for this client right now?"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block">Workspace Summary</Label>
                        <Textarea
                          value={workspace.summary}
                          onChange={(e) =>
                            updateWorkspace((current) => ({
                              ...current,
                              summary: e.target.value,
                            }))
                          }
                          placeholder="Capture the latest working summary for this client."
                          rows={4}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Last saved: {formatTimestamp(workspace.updatedAt)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pulse Context</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{pulseWorkItemCount} pulse items</Badge>
                        <Badge variant="outline">{activeRoleSuggestionCount} active role drafts</Badge>
                        {workspaceActionCounts ? (
                          <Badge variant="secondary">{workspaceActionCounts.open} open actions</Badge>
                        ) : null}
                      </div>

                      <div className="rounded-lg border p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Pulse Summary</p>
                        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                          {client.pulseSummary || "No client-specific pulse summary has been generated yet."}
                        </p>
                      </div>

                      <div className="rounded-lg border p-3 space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Connected Signals</p>
                        <p className="text-sm">
                          <strong>Deploy:</strong> {client.deployStatus}
                        </p>
                        <p className="text-sm">
                          <strong>Repos:</strong>{" "}
                          {client.githubRepos && client.githubRepos.length > 0
                            ? client.githubRepos.join(", ")
                            : "No GitHub repos linked"}
                        </p>
                        <p className="text-sm">
                          <strong>Hosts:</strong>{" "}
                          {client.deployHosts && client.deployHosts.length > 0
                            ? client.deployHosts.join(", ")
                            : client.deployUrl || "No deploy hosts linked"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-3 text-base">
                        <span>Notes</span>
                        <Button size="sm" variant="outline" onClick={handleAddWorkspaceNote}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {workspace.notes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No notes yet. Capture client context, meeting takeaways, or decisions here.
                        </p>
                      ) : (
                        workspace.notes.map((note) => (
                          <div key={note.id} className="rounded-lg border p-4 space-y-3">
                            <div className="flex flex-col gap-3 lg:flex-row">
                              <Input
                                value={note.title}
                                onChange={(e) =>
                                  handleUpdateWorkspaceNote(note.id, { title: e.target.value })
                                }
                                placeholder="Note title"
                              />
                              <div className="flex gap-2 lg:w-[260px]">
                                <Select
                                  value={note.kind}
                                  onValueChange={(value) =>
                                    handleUpdateWorkspaceNote(note.id, {
                                      kind: value as ClientWorkspaceNoteKind,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WORKSPACE_NOTE_KIND_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveWorkspaceNote(note.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>

                            <Textarea
                              value={note.body}
                              onChange={(e) =>
                                handleUpdateWorkspaceNote(note.id, { body: e.target.value })
                              }
                              placeholder="Write the note details here..."
                              rows={4}
                            />

                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={note.pinned}
                                  onChange={(e) =>
                                    handleUpdateWorkspaceNote(note.id, { pinned: e.target.checked })
                                  }
                                  className="rounded"
                                />
                                Pin note
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Updated {formatTimestamp(note.updatedAt)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-3 text-base">
                        <span>Actions</span>
                        <Button size="sm" variant="outline" onClick={handleAddWorkspaceAction}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Action
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {workspace.actions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No actions yet. Track delivery tasks, blockers, and follow-ups here.
                        </p>
                      ) : (
                        workspace.actions.map((action) => (
                          <div key={action.id} className="rounded-lg border p-4 space-y-3">
                            <div className="flex flex-col gap-3 lg:flex-row">
                              <Input
                                value={action.title}
                                onChange={(e) =>
                                  handleUpdateWorkspaceAction(action.id, { title: e.target.value })
                                }
                                placeholder="Action title"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveWorkspaceAction(action.id)}
                              >
                                Remove
                              </Button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <div>
                                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                                  Status
                                </Label>
                                <Select
                                  value={action.status}
                                  onValueChange={(value) =>
                                    handleUpdateWorkspaceAction(action.id, {
                                      status: value as ClientWorkspaceActionStatus,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WORKSPACE_ACTION_STATUS_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                                  Priority
                                </Label>
                                <Select
                                  value={action.priority}
                                  onValueChange={(value) =>
                                    handleUpdateWorkspaceAction(action.id, {
                                      priority: value as ClientWorkspacePriority,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WORKSPACE_PRIORITY_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                                  Owner
                                </Label>
                                <Input
                                  value={action.owner ?? ""}
                                  onChange={(e) =>
                                    handleUpdateWorkspaceAction(action.id, { owner: e.target.value })
                                  }
                                  placeholder="Owner"
                                />
                              </div>
                              <div>
                                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                                  Due Date
                                </Label>
                                <Input
                                  type="date"
                                  value={action.dueDate ?? ""}
                                  onChange={(e) =>
                                    handleUpdateWorkspaceAction(action.id, { dueDate: e.target.value })
                                  }
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                                Details
                              </Label>
                              <Textarea
                                value={action.detail ?? ""}
                                onChange={(e) =>
                                  handleUpdateWorkspaceAction(action.id, { detail: e.target.value })
                                }
                                placeholder="Capture the action details, context, or blockers."
                                rows={3}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3 text-base">
                      <span>Canvas</span>
                      <Button size="sm" variant="outline" onClick={handleAddCanvasBlock}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Block
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Treat this like a lightweight markdown canvas for the client. Pulse, notes, and next-step framing
                      can all live here.
                    </p>

                    {workspace.canvas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No canvas blocks yet.</p>
                    ) : (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {workspace.canvas.map((block) => (
                          <div key={block.id} className="rounded-lg border p-4 space-y-3">
                            <div className="flex flex-col gap-3 lg:flex-row">
                              <Input
                                value={block.title}
                                onChange={(e) =>
                                  handleUpdateCanvasBlock(block.id, { title: e.target.value })
                                }
                                placeholder="Block title"
                              />
                              <div className="flex gap-2 lg:w-[280px]">
                                <Select
                                  value={block.kind}
                                  onValueChange={(value) =>
                                    handleUpdateCanvasBlock(block.id, {
                                      kind: value as ClientWorkspaceCanvasKind,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WORKSPACE_CANVAS_KIND_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveCanvasBlock(block.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>

                            <Textarea
                              value={block.content}
                              onChange={(e) =>
                                handleUpdateCanvasBlock(block.id, { content: e.target.value })
                              }
                              placeholder="Use this block for working notes, scope, risks, or markdown-style outlines."
                              rows={6}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Workspace unavailable right now.
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Draft Role Suggestions
                  </span>
                  <Button onClick={handleGenerateRoleSuggestions} disabled={generatingRoleSuggestions}>
                    {generatingRoleSuggestions ? "Generating…" : "Generate Draft Roles"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Unified inputs: website content, client record details, pulse output, and recent client updates. These
                  are draft suggestions only until a client or admin changes their status.
                </p>
                {roleSuggestionSnapshot ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm"><strong>Business type:</strong> {roleSuggestionSnapshot.businessType || "Unknown"}</p>
                      {roleSuggestionSnapshot.summary ? (
                        <p className="mt-2 text-sm text-muted-foreground">{roleSuggestionSnapshot.summary}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Generated {new Date(roleSuggestionSnapshot.generatedAt).toLocaleString()}
                      </p>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Work Contexts</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-2">
                        {roleSuggestionSnapshot.workContexts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No work contexts generated yet.</p>
                        ) : (
                          roleSuggestionSnapshot.workContexts.map((context) => (
                            <div key={context.id} className="rounded-lg border p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium">{context.label}</p>
                                <Badge variant="outline">{context.status}</Badge>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">{context.summary}</p>
                              {context.sources.length > 0 ? (
                                <p className="mt-3 text-xs text-muted-foreground">
                                  Sources: {context.sources.join(", ")}
                                </p>
                              ) : null}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Suggested Roles</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {roleSuggestionSnapshot.roleSuggestions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No role suggestions generated yet.</p>
                        ) : (
                          roleSuggestionSnapshot.roleSuggestions.map((suggestion) => (
                            <div key={suggestion.id} className="rounded-lg border p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">{suggestion.title}</p>
                                    <Badge variant="outline">{suggestion.category}</Badge>
                                    <Badge variant="secondary">{suggestion.workstream}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{suggestion.summary}</p>
                                  <p className="text-sm">{suggestion.rationale}</p>
                                  {suggestion.sourceContexts.length > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      Contexts: {suggestion.sourceContexts.join(", ")}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="lg:w-[220px]">
                                  <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                                    Review Status
                                  </Label>
                                  <Select
                                    value={suggestion.status}
                                    onValueChange={(value) =>
                                      handleUpdateRoleSuggestionStatus(
                                        suggestion.id,
                                        value as "suggested" | "shortlisted" | "approved" | "rejected"
                                      )
                                    }
                                    disabled={updatingRoleStatusId === suggestion.id}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="suggested">Suggested</SelectItem>
                                      <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                      <SelectItem value="approved">Approved</SelectItem>
                                      <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    No unified role suggestion snapshot exists for this client yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="updates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Updates feed</h2>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add update
              </Button>
            </div>
            {updatesLoading ? (
              <p className="text-muted-foreground text-sm">Loading updates…</p>
            ) : updates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No updates yet. Create one to show in the story module feed.
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {updates.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium">{u.title}</span>
                        <Badge variant={u.status === "published" ? "default" : "secondary"}>
                          {u.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{u.type}</span>
                      </div>
                      {u.summary && (
                        <p className="text-sm text-muted-foreground mb-2">{u.summary}</p>
                      )}
                      <p className="text-xs text-muted-foreground mb-3">
                        {new Date(u.createdAt).toLocaleString()}
                        {u.versionLabel && ` · ${u.versionLabel}`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {u.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublish(u.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Publish
                          </Button>
                        )}
                        <label className="cursor-pointer inline-block">
                          <input
                            type="file"
                            accept="video/mp4,video/*"
                            className="hidden"
                            disabled={videoUploading === u.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleVideoUpload(u.id, f)
                              e.target.value = ""
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                          >
                            {videoUploading === u.id ? (
                              "Uploading…"
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                {u.video?.publicUrl ? "Replace video" : "Upload video"}
                              </>
                            )}
                          </Button>
                        </label>
                        {u.video?.publicUrl && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={u.video.publicUrl} target="_blank" rel="noopener noreferrer">
                              Watch
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as ModuleKey }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Update title"
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Input
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Short summary"
              />
            </div>
            <div>
              <Label>Details</Label>
              <Textarea
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                placeholder="Optional details"
                rows={3}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as UpdateStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUpdate} disabled={!form.title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information in Firebase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label htmlFor="edit-storyId">Story ID *</Label>
                <Input
                  id="edit-storyId"
                  value={editForm.storyId}
                  onChange={(e) => setEditForm({ ...editForm, storyId: e.target.value })}
                  placeholder="e.g. femileasing"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-brands">Brands (comma-separated)</Label>
              <Input
                id="edit-brands"
                value={editForm.brands.join(', ')}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  brands: e.target.value.split(',').map(b => b.trim()).filter(Boolean)
                })}
                placeholder="Brand 1, Brand 2, Brand 3"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: ClientStatus) => setEditForm({ ...editForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-deployStatus">Deploy Status</Label>
                <Select
                  value={editForm.deployStatus}
                  onValueChange={(value: DeployStatus) => setEditForm({ ...editForm, deployStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-stripeStatus">Stripe Status</Label>
                <Select
                  value={editForm.stripeStatus}
                  onValueChange={(value: StripeStatus) => setEditForm({ ...editForm, stripeStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-deployUrl">Deploy URL</Label>
              <Input
                id="edit-deployUrl"
                type="url"
                value={editForm.deployUrl}
                onChange={(e) => setEditForm({ ...editForm, deployUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-websiteUrl">Website URL</Label>
                <Input
                  id="edit-websiteUrl"
                  type="url"
                  value={editForm.websiteUrl}
                  onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-appUrl">App URL</Label>
                <Input
                  id="edit-appUrl"
                  type="url"
                  value={editForm.appUrl}
                  onChange={(e) => setEditForm({ ...editForm, appUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-githubRepo">GitHub Repo</Label>
              <Input
                id="edit-githubRepo"
                value={editForm.githubRepo}
                onChange={(e) => setEditForm({ ...editForm, githubRepo: e.target.value })}
                placeholder="owner/repo or https://github.com/owner/repo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-githubReposCsv">GitHub Repos (CSV)</Label>
                <Input
                  id="edit-githubReposCsv"
                  value={editForm.githubReposCsv}
                  onChange={(e) => setEditForm({ ...editForm, githubReposCsv: e.target.value })}
                  placeholder="owner/repo-one, owner/repo-two"
                />
              </div>
              <div>
                <Label htmlFor="edit-deployHostsCsv">Deploy Hosts (CSV)</Label>
                <Input
                  id="edit-deployHostsCsv"
                  value={editForm.deployHostsCsv}
                  onChange={(e) => setEditForm({ ...editForm, deployHostsCsv: e.target.value })}
                  placeholder="app.example.com, preview.example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-appStoreUrl">App Store URL</Label>
              <Input
                id="edit-appStoreUrl"
                type="url"
                value={editForm.appStoreUrl}
                onChange={(e) => setEditForm({ ...editForm, appStoreUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-rdUrl">R/D URL</Label>
                <Input
                  id="edit-rdUrl"
                  type="url"
                  value={editForm.rdUrl}
                  onChange={(e) => setEditForm({ ...editForm, rdUrl: e.target.value })}
                  placeholder="https://... (shows R/D card when set)"
                />
              </div>
              <div>
                <Label htmlFor="edit-housingUrl">Housing URL</Label>
                <Input
                  id="edit-housingUrl"
                  type="url"
                  value={editForm.housingUrl}
                  onChange={(e) => setEditForm({ ...editForm, housingUrl: e.target.value })}
                  placeholder="https://... (shows Housing card when set)"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-transportationUrl">Transportation URL</Label>
                <Input
                  id="edit-transportationUrl"
                  type="url"
                  value={editForm.transportationUrl}
                  onChange={(e) => setEditForm({ ...editForm, transportationUrl: e.target.value })}
                  placeholder="https://... (shows Transportation card when set)"
                />
              </div>
              <div>
                <Label htmlFor="edit-insuranceUrl">Insurance URL</Label>
                <Input
                  id="edit-insuranceUrl"
                  type="url"
                  value={editForm.insuranceUrl}
                  onChange={(e) => setEditForm({ ...editForm, insuranceUrl: e.target.value })}
                  placeholder="https://... (shows Insurance card when set)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-storyVideoUrl">Story Video URL *</Label>
              <Input
                id="edit-storyVideoUrl"
                type="url"
                value={editForm.storyVideoUrl}
                onChange={(e) => setEditForm({ ...editForm, storyVideoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-showOnFrontend"
                checked={editForm.showOnFrontend}
                onChange={(e) => setEditForm({ ...editForm, showOnFrontend: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-showOnFrontend" className="cursor-pointer">
                Show on Frontend Roster
              </Label>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="edit-revenue">Revenue</Label>
                <Input
                  id="edit-revenue"
                  type="number"
                  value={editForm.revenue}
                  onChange={(e) => setEditForm({ ...editForm, revenue: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-meetings">Meetings</Label>
                <Input
                  id="edit-meetings"
                  type="number"
                  value={editForm.meetings}
                  onChange={(e) => setEditForm({ ...editForm, meetings: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-emails">Emails</Label>
                <Input
                  id="edit-emails"
                  type="number"
                  value={editForm.emails}
                  onChange={(e) => setEditForm({ ...editForm, emails: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-commits">Commits</Label>
                <Input
                  id="edit-commits"
                  type="number"
                  value={editForm.commits}
                  onChange={(e) => setEditForm({ ...editForm, commits: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-lastActivity">Last Activity</Label>
              <Input
                id="edit-lastActivity"
                type="datetime-local"
                value={(() => {
                  if (!editForm.lastActivity) return ''
                  const d = new Date(editForm.lastActivity)
                  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16)
                })()}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  lastActivity: e.target.value ? new Date(e.target.value).toISOString() : ''
                })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="edit-pulseSummary">Pulse Summary</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePulseSummary}
                  disabled={generatingPulse}
                >
                  {generatingPulse ? "Generating…" : "Generate Pulse Summary"}
                </Button>
              </div>
              <Textarea
                id="edit-pulseSummary"
                value={editForm.pulseSummary}
                onChange={(e) => setEditForm({ ...editForm, pulseSummary: e.target.value })}
                placeholder="Summary of recent activity..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isNewStory"
                checked={editForm.isNewStory}
                onChange={(e) => setEditForm({ ...editForm, isNewStory: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-isNewStory" className="cursor-pointer">
                Is New Story
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editForm.name.trim() || !editForm.storyId.trim() || !editForm.storyVideoUrl.trim() || editSubmitting}
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
