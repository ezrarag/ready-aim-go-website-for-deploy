"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MoreHorizontal,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard-layout"
import { AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { RepoConnectModal } from "@/components/admin/repo-connect-modal"
import { ClientManageModal } from "@/components/admin/client-manage-modal"
import { GuidesView } from "@/components/admin/guides-view"
import { WorkspaceQuestionnairesPanel } from "@/components/admin/workspace-questionnaires-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  getAdminHubHref,
  normalizeAdminHubView,
  type AdminHubView,
} from "@/lib/admin-navigation"
import {
  ADMIN_PRODUCT_KEYS,
  ADMIN_PRODUCT_LABELS,
  getModuleKeysForProducts,
  getProductsForModuleKeys,
  type AdminProductKey,
} from "@/lib/admin/products"
import type {
  AdminHubClient,
  AdminHubPayload,
  AdminHubPerson,
  AdminHubTask,
  AdminHubWorkspace,
} from "@/lib/admin/ops-hub"
import type {
  WorkspaceDuplicateCluster,
} from "@/lib/admin/workspace-duplicates"
import type { WorkspacePurgePlan } from "@/lib/admin/workspace-purge"

type AdminHubState = AdminHubPayload["data"] & {
  error: string | null
}

type WorkspaceEditorState = {
  workspace: AdminHubWorkspace | null
  name: string
  clientId: string
  setCanonicalForClient: boolean
  publicUrl: string
  previewImageUrl: string
  showOnFrontend: boolean
  frontEndProducts: AdminProductKey[]
  frontEndTags: string[]
  tagDraft: string
  saving: boolean
  error: string | null
}

type WorkspaceRepoOption = {
  id: number
  fullName: string
  htmlUrl: string
  description: string | null
  language: string | null
  private: boolean
  updatedAt: string | null
  alreadyConnected?: boolean
  connectedClientId?: string | null
  connectedClientName?: string | null
}

type WorkspaceRepoLink = {
  id: string
  repoSlug: string
  htmlUrl: string | null
  clientId: string | null
  workspaceId: string | null
}

type WorkspaceBulkAction = "show" | "hide" | "autofill" | "clearUrl"

const emptyState: AdminHubState = {
  clients: [],
  people: [],
  workspaces: [],
  projects: [],
  tasks: [],
  warnings: [],
  loadedAt: "",
  error: null,
}

const emptyWorkspaceEditor: WorkspaceEditorState = {
  workspace: null,
  name: "",
  clientId: "",
  setCanonicalForClient: false,
  publicUrl: "",
  previewImageUrl: "",
  showOnFrontend: false,
  frontEndProducts: [],
  frontEndTags: [],
  tagDraft: "",
  saving: false,
  error: null,
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No date"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

function isOpenTask(task: AdminHubTask) {
  return task.status !== "done" && task.status !== "declined" && task.status !== "cancelled"
}

function isBlockedTask(task: AdminHubTask) {
  return task.status === "blocked" || Boolean(task.blocker)
}

function statusClass(status: string) {
  if (status === "active" || status === "live" || status === "done") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }
  if (status === "blocked" || status === "error" || status === "suspended") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
  }
  if (status === "trialing" || status === "in_progress" || status === "accepted") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function searchText(values: Array<unknown>, query: string) {
  if (!query) return true
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query.toLowerCase())
}

function ProductChips({ products }: { products: AdminProductKey[] }) {
  if (products.length === 0) {
    return <span className="text-xs text-muted-foreground">None</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {products.map((product) => (
        <Badge key={product} variant="outline" className="rounded-md">
          {ADMIN_PRODUCT_LABELS[product]}
        </Badge>
      ))}
    </div>
  )
}

function EmptyRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = normalizeAdminHubView(searchParams.get("view"))
  const requestedClientId = searchParams.get("clientId")?.trim() || ""
  const requestedWorkspaceId = searchParams.get("workspace")?.trim() || ""
  const requestedWorkspacePanel = searchParams.get("panel")?.trim() || ""
  const [state, setState] = useState<AdminHubState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [duplicateClusters, setDuplicateClusters] = useState<WorkspaceDuplicateCluster[]>([])
  const [purgingWorkspaceId, setPurgingWorkspaceId] = useState<string | null>(null)
  const [repoConnectOpen, setRepoConnectOpen] = useState(false)
  const [manageClient, setManageClient] = useState<AdminHubClient | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const [workspaceEditor, setWorkspaceEditor] = useState<WorkspaceEditorState>(emptyWorkspaceEditor)
  const [workspaceRepoEditorOpen, setWorkspaceRepoEditorOpen] = useState(false)
  const [workspaceRepoEditorWorkspace, setWorkspaceRepoEditorWorkspace] = useState<AdminHubWorkspace | null>(null)
  const [workspaceRepoOptions, setWorkspaceRepoOptions] = useState<WorkspaceRepoOption[]>([])
  const [workspaceRepoLinks, setWorkspaceRepoLinks] = useState<WorkspaceRepoLink[]>([])
  const [workspaceRepoSelected, setWorkspaceRepoSelected] = useState<string[]>([])
  const [workspaceRepoLoading, setWorkspaceRepoLoading] = useState(false)
  const [workspaceRepoSaving, setWorkspaceRepoSaving] = useState(false)
  const [workspaceRepoRemovingId, setWorkspaceRepoRemovingId] = useState<string | null>(null)
  const [workspaceRepoError, setWorkspaceRepoError] = useState<string | null>(null)
  const [togglingWorkspaceId, setTogglingWorkspaceId] = useState<string | null>(null)
  const [editingWorkspaceClientId, setEditingWorkspaceClientId] = useState<string | null>(null)
  const [editingWorkspaceClientValue, setEditingWorkspaceClientValue] = useState("")
  const [savingWorkspaceClientId, setSavingWorkspaceClientId] = useState<string | null>(null)
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([])
  const [workspaceBulkSaving, setWorkspaceBulkSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [taskStatus, setTaskStatus] = useState("open")

  const loadOps = async () => {
    setRefreshing(true)
    setLoading((current) => current || !state.loadedAt)
    try {
      const response = await fetch("/api/admin/ops?limit=500", { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Admin ops returned ${response.status}`)
      }
      setState({ ...(payload.data as AdminHubPayload["data"]), error: null })
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to load admin operations.",
      }))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadDuplicateAudit = async () => {
    try {
      const response = await fetch("/api/admin/workspace-duplicates?limit=500", { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Duplicate audit returned ${response.status}`)
      }
      setDuplicateClusters(Array.isArray(payload.data?.clusters) ? payload.data.clusters : [])
    } catch (error) {
      setDuplicateClusters([])
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to load duplicate audit.",
      }))
    }
  }

  useEffect(() => {
    void loadOps()
    void loadDuplicateAudit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clientById = useMemo(() => new Map(state.clients.map((client) => [client.id, client])), [state.clients])
  const workspaceById = useMemo(
    () => new Map(state.workspaces.map((workspace) => [workspace.id, workspace])),
    [state.workspaces]
  )
  const duplicateClusterByWorkspaceId = useMemo(() => {
    const map = new Map<string, WorkspaceDuplicateCluster>()
    for (const cluster of duplicateClusters) {
      for (const workspace of cluster.workspaces) {
        map.set(workspace.id, cluster)
      }
    }
    return map
  }, [duplicateClusters])

  const visibleClients = useMemo(
    () =>
      state.clients.filter((client) =>
        searchText([client.name, client.storyId, client.contactEmail, client.portalEmail, client.workspaceId, client.activeProducts], search)
      ),
    [state.clients, search]
  )
  const visiblePeople = useMemo(
    () =>
      state.people.filter((person) =>
        (person.status === "pending" || person.clientIds.length > 0 || Boolean(person.activeClientId)) &&
        searchText([person.name, person.email, person.role, person.clientIds, person.activeClientId], search)
      ),
    [state.people, search]
  )
  const visibleWorkspaces = useMemo(
    () =>
      state.workspaces.filter((workspace) =>
        searchText(
          [
            workspace.name,
            workspace.id,
            workspace.clientId,
            workspace.ownerUid,
            workspace.publicUrl,
            workspace.frontEndProducts,
            workspace.frontEndTags,
          ],
          search
        )
      ),
    [state.workspaces, search]
  )
  const visibleTasks = useMemo(
    () =>
      state.tasks
        .filter((task) => {
          if (taskStatus === "all") return true
          if (taskStatus === "open") return isOpenTask(task)
          if (taskStatus === "blocked") return isBlockedTask(task)
          return task.status === taskStatus
        })
        .filter((task) =>
          searchText([task.title, task.summary, task.blocker, task.clientName, task.clientId, task.workspaceId, task.projectId, task.owner, task.product], search)
        ),
    [state.tasks, taskStatus, search]
  )
  useEffect(() => {
    if (view !== "workspaces" || !requestedWorkspaceId) return
    const workspace = workspaceById.get(requestedWorkspaceId)
    if (!workspace) return

    if (requestedWorkspacePanel === "repos") {
      void openWorkspaceRepoEditor(workspace).finally(() => {
        router.replace(getAdminHubHref("workspaces"), { scroll: false })
      })
      return
    }

    openWorkspaceEditor(workspace)
    router.replace(getAdminHubHref("workspaces"), { scroll: false })
  }, [requestedWorkspaceId, requestedWorkspacePanel, router, view, workspaceById])

  useEffect(() => {
    if (view !== "clients" || !requestedClientId) return
    const client = clientById.get(requestedClientId)
    if (!client) return
    setManageClient(client)
    router.replace(getAdminHubHref("clients"), { scroll: false })
  }, [clientById, requestedClientId, router, view])

  const openWorkspaceEditor = (workspace: AdminHubWorkspace) => {
    const linkedClient = workspace.clientId ? clientById.get(workspace.clientId) : null
    setWorkspaceEditor({
      workspace,
      name: workspace.name || workspace.id,
      clientId: workspace.clientId || "",
      setCanonicalForClient: linkedClient?.workspaceId === workspace.id,
      publicUrl: workspace.publicUrl || "",
      previewImageUrl: workspace.previewImageUrl || "",
      showOnFrontend: workspace.showOnFrontend,
      frontEndProducts:
        workspace.frontEndProducts.length > 0
          ? getProductsForModuleKeys(workspace.frontEndProducts)
          : linkedClient?.activeProducts ?? getProductsForModuleKeys(linkedClient?.storyModules ?? []),
      frontEndTags: workspace.frontEndTags,
      tagDraft: "",
      saving: false,
      error: null,
    })
  }

  const closeWorkspaceEditor = () => {
    setWorkspaceEditor(emptyWorkspaceEditor)
  }

  const allVisibleWorkspaceIds = visibleWorkspaces.map((workspace) => workspace.id)
  const allVisibleSelected =
    allVisibleWorkspaceIds.length > 0 &&
    allVisibleWorkspaceIds.every((workspaceId) => selectedWorkspaceIds.includes(workspaceId))

  const setView = (nextView: AdminHubView) => router.push(getAdminHubHref(nextView))

  const saveWorkspaceVisibility = async () => {
    if (!workspaceEditor.workspace) return

    setWorkspaceEditor((current) => ({ ...current, saving: true, error: null }))
    try {
      const response = await fetch(
        `/api/admin/workspaces/${encodeURIComponent(workspaceEditor.workspace.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workspaceEditor.name.trim(),
            clientId: workspaceEditor.clientId.trim() || null,
            setCanonicalForClient: workspaceEditor.setCanonicalForClient,
            showOnFrontend: workspaceEditor.showOnFrontend,
            publicUrl: workspaceEditor.publicUrl.trim(),
            previewImageUrl: workspaceEditor.previewImageUrl.trim(),
            frontEndProducts: getModuleKeysForProducts(workspaceEditor.frontEndProducts),
            frontEndTags: workspaceEditor.frontEndTags,
          }),
        }
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Workspace update returned ${response.status}`)
      }
      closeWorkspaceEditor()
      await loadOps()
    } catch (error) {
      setWorkspaceEditor((current) => ({
        ...current,
        saving: false,
        error: error instanceof Error ? error.message : "Unable to save workspace settings.",
      }))
    }
  }

  const openWorkspaceRepoEditor = async (workspace: AdminHubWorkspace) => {
    setWorkspaceRepoEditorOpen(true)
    setWorkspaceRepoEditorWorkspace(workspace)
    setWorkspaceRepoSelected([])
    setWorkspaceRepoError(null)
    setWorkspaceRepoLoading(true)
    try {
      const [repoLinksResponse, githubReposResponse] = await Promise.all([
        fetch(`/api/admin/repos?workspaceId=${encodeURIComponent(workspace.id)}&limit=200`, {
          cache: "no-store",
        }),
        fetch("/api/admin/github-repos?includeConnected=true", { cache: "no-store" }),
      ])
      const repoLinksPayload = await repoLinksResponse.json().catch(() => ({}))
      const githubReposPayload = await githubReposResponse.json().catch(() => ({}))
      if (!repoLinksResponse.ok || repoLinksPayload?.success !== true) {
        throw new Error(repoLinksPayload?.error || `Workspace repos returned ${repoLinksResponse.status}`)
      }
      if (!githubReposResponse.ok || githubReposPayload?.success !== true) {
        throw new Error(githubReposPayload?.error || `GitHub repos returned ${githubReposResponse.status}`)
      }
      setWorkspaceRepoLinks(Array.isArray(repoLinksPayload.data) ? repoLinksPayload.data : [])
      setWorkspaceRepoOptions(Array.isArray(githubReposPayload.repos) ? githubReposPayload.repos : [])
    } catch (error) {
      setWorkspaceRepoLinks([])
      setWorkspaceRepoOptions([])
      setWorkspaceRepoError(error instanceof Error ? error.message : "Unable to load workspace repos.")
    } finally {
      setWorkspaceRepoLoading(false)
    }
  }

  const closeWorkspaceRepoEditor = () => {
    setWorkspaceRepoEditorOpen(false)
    setWorkspaceRepoEditorWorkspace(null)
    setWorkspaceRepoOptions([])
    setWorkspaceRepoLinks([])
    setWorkspaceRepoSelected([])
    setWorkspaceRepoError(null)
    setWorkspaceRepoLoading(false)
    setWorkspaceRepoSaving(false)
    setWorkspaceRepoRemovingId(null)
  }

  const toggleWorkspaceFrontend = async (workspace: AdminHubWorkspace) => {
    setTogglingWorkspaceId(workspace.id)
    try {
      const response = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspace.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showOnFrontend: !workspace.showOnFrontend,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Workspace visibility returned ${response.status}`)
      }
      await loadOps()
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to update workspace visibility.",
      }))
    } finally {
      setTogglingWorkspaceId(null)
    }
  }

  const startWorkspaceClientEdit = (workspace: AdminHubWorkspace) => {
    setEditingWorkspaceClientId(workspace.id)
    setEditingWorkspaceClientValue(workspace.clientId || "")
  }

  const cancelWorkspaceClientEdit = () => {
    setEditingWorkspaceClientId(null)
    setEditingWorkspaceClientValue("")
  }

  const saveWorkspaceClientLink = async (workspace: AdminHubWorkspace) => {
    setSavingWorkspaceClientId(workspace.id)
    try {
      const nextClientId = editingWorkspaceClientValue.trim()
      const response = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspace.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: nextClientId || null,
          setCanonicalForClient: Boolean(nextClientId),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Workspace relink returned ${response.status}`)
      }
      cancelWorkspaceClientEdit()
      await loadOps()
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to relink workspace person.",
      }))
    } finally {
      setSavingWorkspaceClientId(null)
    }
  }

  const saveWorkspaceRepos = async () => {
    if (!workspaceRepoEditorWorkspace) return
    const workspace = workspaceRepoEditorWorkspace
    const clientId = workspace.clientId?.trim() || ""
    if (!clientId) {
      setWorkspaceRepoError("Link the workspace to a client before assigning repos.")
      return
    }
    if (workspaceRepoSelected.length === 0) return

    setWorkspaceRepoSaving(true)
    setWorkspaceRepoError(null)
    try {
      for (const repoSlug of workspaceRepoSelected) {
        const option = workspaceRepoOptions.find((repo) => repo.fullName.toLowerCase() === repoSlug.toLowerCase())
        const response = await fetch("/api/admin/repos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoSlug,
            htmlUrl: option?.htmlUrl ?? `https://github.com/${repoSlug}`,
            clientId,
            workspaceId: workspace.id,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.success !== true) {
          throw new Error(payload?.error || `Repo save returned ${response.status}`)
        }
      }
      await openWorkspaceRepoEditor(workspace)
      await loadOps()
    } catch (error) {
      setWorkspaceRepoError(error instanceof Error ? error.message : "Unable to save repo links.")
    } finally {
      setWorkspaceRepoSaving(false)
    }
  }

  const removeWorkspaceRepo = async (repoLink: WorkspaceRepoLink) => {
    setWorkspaceRepoRemovingId(repoLink.id)
    setWorkspaceRepoError(null)
    try {
      const response = await fetch(`/api/admin/repos/${encodeURIComponent(repoLink.id)}`, {
        method: "DELETE",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Repo delete returned ${response.status}`)
      }
      if (workspaceRepoEditorWorkspace) {
        await openWorkspaceRepoEditor(workspaceRepoEditorWorkspace)
      }
      await loadOps()
    } catch (error) {
      setWorkspaceRepoError(error instanceof Error ? error.message : "Unable to remove repo link.")
    } finally {
      setWorkspaceRepoRemovingId(null)
    }
  }

  const deleteClient = async (client: AdminHubClient) => {
    const confirmed = window.confirm(
      [
        `Archive client "${client.name}"?`,
        "",
        "This removes it from the active admin lists, unlinks its canonical workspace, and detaches repo-client links.",
        "The underlying workspace and repo records stay in Firestore for reassignment.",
      ].join("\n")
    )
    if (!confirmed) return

    setDeletingClientId(client.id)
    try {
      const response = await fetch(`/api/admin/clients/${encodeURIComponent(client.id)}`, {
        method: "DELETE",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Client archive returned ${response.status}`)
      }
      if (manageClient?.id === client.id) setManageClient(null)
      await loadOps()
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to archive client.",
      }))
    } finally {
      setDeletingClientId(null)
    }
  }

  const runWorkspaceBulkAction = async (action: WorkspaceBulkAction) => {
    if (selectedWorkspaceIds.length === 0) return

    setWorkspaceBulkSaving(true)
    try {
      const body: Record<string, unknown> = { workspaceIds: selectedWorkspaceIds }
      if (action === "show") body.showOnFrontend = true
      if (action === "hide") body.showOnFrontend = false
      if (action === "autofill") body.useSuggestedPublicUrl = true
      if (action === "clearUrl") body.clearPublicUrl = true

      const response = await fetch("/api/admin/workspaces/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Workspace bulk update returned ${response.status}`)
      }
      setSelectedWorkspaceIds([])
      await loadOps()
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to bulk update workspaces.",
      }))
    } finally {
      setWorkspaceBulkSaving(false)
    }
  }

  const purgeWorkspace = async (workspace: AdminHubWorkspace) => {
    setPurgingWorkspaceId(workspace.id)
    try {
      const previewResponse = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspace.id)}/purge`, {
        cache: "no-store",
      })
      const previewPayload = await previewResponse.json().catch(() => ({}))
      if (!previewResponse.ok || previewPayload?.success !== true) {
        throw new Error(previewPayload?.error || `Purge preview returned ${previewResponse.status}`)
      }
      const preview = previewPayload.data as WorkspacePurgePlan
      const subcollectionDocCount = preview.subcollectionDeletes.reduce((sum, item) => sum + item.docIds.length, 0)
      const confirmed = window.confirm(
        [
          `Purge workspace "${workspace.id}"?`,
          "",
          `Users updated: ${preview.userUpdates.length}`,
          `Clients updated: ${preview.clientUpdates.length}`,
          `Allowlist records updated: ${preview.allowlistUpdates.length}`,
          `Projects deleted: ${preview.projectDeletes.length}`,
          `Tasks deleted: ${preview.taskDeletes.length}`,
          `Workspace subcollection docs deleted: ${subcollectionDocCount}`,
          "",
          "This deletes the workspace record and cannot be undone from the UI.",
        ].join("\n")
      )
      if (!confirmed) return

      const response = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspace.id)}/purge`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmWorkspaceId: workspace.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Purge returned ${response.status}`)
      }
      await Promise.all([loadOps(), loadDuplicateAudit()])
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to purge workspace.",
      }))
    } finally {
      setPurgingWorkspaceId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              ReadyAimGo Ops
            </p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Admin Hub</h1>
            <p className="text-sm text-muted-foreground">
              Clients, people, workspaces, work, and subscriptions in one operating console.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadOps()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => void loadDuplicateAudit()}>
              Audit Duplicates
            </Button>
            <Button asChild>
              <Link href="/clients?intent=new">Create Intake</Link>
            </Button>
          </div>
        </div>

        {state.error ? (
          <AdminPanel>
            <CardContent className="p-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {state.error}
              </div>
            </CardContent>
          </AdminPanel>
        ) : null}

        <AdminPanel>
          <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search names, emails, clients, workspace IDs, products, tasks..."
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["clients", "workspaces", "tasks", "billing", "guides"] as AdminHubView[]).map((item) => (
                <Button key={item} variant={view === item ? "default" : "outline"} onClick={() => setView(item)}>
                  {item === "clients" ? "People" : item.charAt(0).toUpperCase() + item.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </AdminPanel>

        {view === "clients" ? (
          <div className="grid gap-5">
            <AdminPanel className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <AdminPanelTitle>People</AdminPanelTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Canonical relationship records, workspace linkage, and the real people attached to them.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setRepoConnectOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Connect repo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Products</th>
                        <th className="px-4 py-3 font-medium">Workspace</th>
                        <th className="px-4 py-3 font-medium">Portal</th>
                        <th className="px-4 py-3 font-medium">Updated</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleClients.length === 0 ? (
                        <EmptyRow colSpan={6} label={loading ? "Loading people..." : "No relationship records match this view."} />
                      ) : (
                        visibleClients.map((client) => (
                          <tr key={client.id} className="border-b border-border transition hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <Link href={getAdminHubHref("clients", { clientId: client.id })} className="font-medium text-foreground hover:underline">
                                {client.name}
                              </Link>
                              <p className="font-mono text-xs text-muted-foreground">{client.storyId}</p>
                            </td>
                            <td className="px-4 py-3"><ProductChips products={client.activeProducts} /></td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.workspaceId || "Missing"}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.portalEmail || client.contactEmail || "No contact"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(client.updatedAt)}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setManageClient(client)}>
                                  Manage
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void deleteClient(client)}
                                  disabled={deletingClientId === client.id}
                                  className="border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-300"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {deletingClientId === client.id ? "Deleting..." : "Delete"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </AdminPanel>
            <AdminPanel className="overflow-hidden">
              <CardHeader>
                <AdminPanelTitle>People And Access</AdminPanelTitle>
              </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Person</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Clients</th>
                      <th className="px-4 py-3 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePeople.length === 0 ? (
                      <EmptyRow colSpan={5} label={loading ? "Loading people..." : "No people match this view."} />
                    ) : (
                      visiblePeople.map((person) => (
                        <tr key={person.id} className="border-b border-border transition hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <UserRound className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{person.name}</p>
                                <p className="truncate font-mono text-xs text-muted-foreground">{person.email || person.uid || person.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><Badge className={statusClass(person.status)}>{person.status}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground">{person.role || "member"}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {person.clientIds.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Unassigned</span>
                              ) : (
                                person.clientIds.map((clientId) => (
                                  <Link key={clientId} href={getAdminHubHref("clients", { clientId })}>
                                    <Badge variant="outline" className="rounded-md">{clientById.get(clientId)?.name || clientId}</Badge>
                                  </Link>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(person.updatedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            </AdminPanel>
          </div>
        ) : null}

        {view === "workspaces" ? (
          <div className="space-y-5">
            <AdminPanel>
              <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Workspace diagnostics moved</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Duplicate audit, Drive scan diagnostics, and portal visibility checks now live in the top-right menu.
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/workspace-diagnostics">Open workspace diagnostics</Link>
                </Button>
              </CardContent>
            </AdminPanel>

            <AdminPanel className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <AdminPanelTitle>Workspaces</AdminPanelTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Set which workspaces should appear on <code>/work</code>, and map each one to a public URL.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void runWorkspaceBulkAction("show")}
                      disabled={workspaceBulkSaving || selectedWorkspaceIds.length === 0}
                    >
                      Show selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void runWorkspaceBulkAction("hide")}
                      disabled={workspaceBulkSaving || selectedWorkspaceIds.length === 0}
                    >
                      Hide selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void runWorkspaceBulkAction("autofill")}
                      disabled={workspaceBulkSaving || selectedWorkspaceIds.length === 0}
                    >
                      Autofill URLs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void runWorkspaceBulkAction("clearUrl")}
                      disabled={workspaceBulkSaving || selectedWorkspaceIds.length === 0}
                    >
                      Clear URLs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th className="w-12 px-3 py-2.5 font-medium">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={(checked) =>
                              setSelectedWorkspaceIds(checked === true ? allVisibleWorkspaceIds : [])
                            }
                            aria-label="Select visible workspaces"
                          />
                        </th>
                        <th className="px-3 py-2.5 font-medium">Workspace</th>
                        <th className="px-3 py-2.5 font-medium">Person</th>
                        <th className="px-3 py-2.5 font-medium">Repos</th>
                        <th className="px-3 py-2.5 font-medium">Front End</th>
                        <th className="px-3 py-2.5 font-medium">Public URL</th>
                        <th className="px-3 py-2.5 font-medium">Members</th>
                        <th className="px-3 py-2.5 font-medium">Tags</th>
                        <th className="w-14 px-3 py-2.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleWorkspaces.length === 0 ? (
                        <EmptyRow colSpan={9} label={loading ? "Loading workspaces..." : "No workspaces match this view."} />
                      ) : (
                        visibleWorkspaces.map((workspace) => (
                          <tr key={workspace.id} className="border-b border-border transition hover:bg-muted/30">
                            <td className="px-3 py-2.5 align-top">
                              <Checkbox
                                checked={selectedWorkspaceIds.includes(workspace.id)}
                                onCheckedChange={(checked) =>
                                  setSelectedWorkspaceIds((current) =>
                                    checked === true
                                      ? [...new Set([...current, workspace.id])]
                                      : current.filter((id) => id !== workspace.id)
                                  )
                                }
                                aria-label={`Select workspace ${workspace.name}`}
                              />
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/dashboard/workspaces/${encodeURIComponent(workspace.id)}`}
                                  className="font-medium leading-tight text-foreground hover:underline"
                                >
                                  {workspace.name}
                                </Link>
                                {duplicateClusterByWorkspaceId.has(workspace.id) ? (
                                  workspace.id === duplicateClusterByWorkspaceId.get(workspace.id)?.canonicalWorkspaceId ? (
                                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Canonical</Badge>
                                  ) : (
                                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">Duplicate</Badge>
                                  )
                                ) : null}
                              </div>
                              <p className="mt-1 font-mono text-[11px] leading-tight text-muted-foreground">{workspace.id}</p>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              {editingWorkspaceClientId === workspace.id ? (
                                <div className="space-y-2">
                                  <select
                                    value={editingWorkspaceClientValue}
                                    onChange={(event) => setEditingWorkspaceClientValue(event.target.value)}
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  >
                                    <option value="">No linked person</option>
                                    {state.clients.map((client) => (
                                      <option key={client.id} value={client.id}>
                                        {client.name} ({client.id})
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => void saveWorkspaceClientLink(workspace)}
                                      disabled={savingWorkspaceClientId === workspace.id}
                                    >
                                      {savingWorkspaceClientId === workspace.id ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelWorkspaceClientEdit}
                                      disabled={savingWorkspaceClientId === workspace.id}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startWorkspaceClientEdit(workspace)}
                                  className="text-left leading-tight hover:text-foreground hover:underline"
                                >
                                  <span className={workspace.clientId ? "font-medium text-foreground" : "text-muted-foreground"}>
                                    {workspace.clientId ? clientById.get(workspace.clientId)?.name || workspace.clientId : "Unlinked"}
                                  </span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    Click to change association
                                  </span>
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2.5 align-top text-muted-foreground">
                              <button
                                type="button"
                                onClick={() => void openWorkspaceRepoEditor(workspace)}
                                className="text-left leading-tight hover:text-foreground hover:underline"
                              >
                                {workspace.repoCount} repos / {workspace.vercelCount} deploys
                              </button>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <button
                                type="button"
                                onClick={() => void toggleWorkspaceFrontend(workspace)}
                                disabled={togglingWorkspaceId === workspace.id}
                                className="disabled:cursor-not-allowed"
                              >
                                <Badge className={workspace.showOnFrontend ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"}>
                                  {togglingWorkspaceId === workspace.id ? "Saving..." : workspace.showOnFrontend ? "Shown" : "Hidden"}
                                </Badge>
                              </button>
                            </td>
                            <td className="px-3 py-2.5 align-top text-xs text-muted-foreground">
                              {workspace.publicUrl ? (
                                <a href={workspace.publicUrl} target="_blank" rel="noreferrer" className="break-all leading-tight text-foreground hover:underline">
                                  {workspace.publicUrl}
                                </a>
                              ) : workspace.suggestedPublicUrl ? (
                                <span className="break-all leading-tight">Suggested: {workspace.suggestedPublicUrl}</span>
                              ) : (
                                "Missing"
                              )}
                            </td>
                            <td className="px-3 py-2.5 align-top text-muted-foreground">{workspace.memberCount}</td>
                            <td className="px-3 py-2.5 align-top">
                              {workspace.frontEndTags.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {workspace.frontEndTags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="rounded-md">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 align-top text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" aria-label={`Workspace actions for ${workspace.name}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/workspaces/${encodeURIComponent(workspace.id)}`}>
                                      Open workspace
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openWorkspaceEditor(workspace)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit workspace
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void openWorkspaceRepoEditor(workspace)}>
                                    Repos
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => void purgeWorkspace(workspace)}
                                    disabled={purgingWorkspaceId === workspace.id}
                                    className="text-red-700 focus:text-red-700 dark:text-red-300 dark:focus:text-red-300"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {purgingWorkspaceId === workspace.id ? "Purging..." : "Purge"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </AdminPanel>
          </div>
        ) : null}

        {view === "tasks" ? (
          <AdminPanel className="overflow-hidden">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <AdminPanelTitle>Work Queue</AdminPanelTitle>
              <div className="flex flex-wrap gap-2">
                {["open", "blocked", "proposed", "accepted", "in_progress", "done", "all"].map((status) => (
                  <Button key={status} size="sm" variant={taskStatus === status ? "default" : "outline"} onClick={() => setTaskStatus(status)}>
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Workspace</th>
                      <th className="px-4 py-3 font-medium">Owner</th>
                      <th className="px-4 py-3 font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTasks.length === 0 ? (
                      <EmptyRow colSpan={6} label={loading ? "Loading tasks..." : "No tasks match this view."} />
                    ) : (
                      visibleTasks.map((task) => (
                        <tr key={task.id} className="border-b border-border transition hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{task.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{task.blocker || task.summary || task.projectId || task.id}</p>
                          </td>
                          <td className="px-4 py-3"><Badge className={statusClass(task.status)}>{task.status.replace("_", " ")}</Badge></td>
                          <td className="px-4 py-3">{task.clientId ? clientById.get(task.clientId)?.name || task.clientName || task.clientId : "Unlinked"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{task.workspaceId || "Missing"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{task.owner || "Unassigned"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(task.dueAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </AdminPanel>
        ) : null}

        {view === "billing" ? (
          <AdminPanel className="overflow-hidden">
            <CardHeader>
              <AdminPanelTitle>Subscriptions</AdminPanelTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Client</th>
                      {ADMIN_PRODUCT_KEYS.map((product) => (
                        <th key={product} className="px-4 py-3 font-medium">{ADMIN_PRODUCT_LABELS[product]}</th>
                      ))}
                      <th className="px-4 py-3 font-medium">Billing Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleClients.length === 0 ? (
                      <EmptyRow colSpan={6} label={loading ? "Loading subscriptions..." : "No clients match this view."} />
                    ) : (
                      visibleClients.map((client) => (
                        <tr key={client.id} className="border-b border-border transition hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Link href={getAdminHubHref("clients", { clientId: client.id })} className="font-medium text-foreground hover:underline">
                              {client.name}
                            </Link>
                            <p className="font-mono text-xs text-muted-foreground">{client.id}</p>
                          </td>
                          {ADMIN_PRODUCT_KEYS.map((product) => {
                            const subscription = client.subscriptions[product]
                            return (
                              <td key={product} className="px-4 py-3">
                                <Badge className={statusClass(subscription.status)}>{subscription.status}</Badge>
                                {subscription.legacy ? <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">legacy fallback</p> : null}
                                {subscription.planId ? <p className="mt-1 font-mono text-xs text-muted-foreground">{subscription.planId}</p> : null}
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.portalEmail || client.contactEmail || "No contact"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </AdminPanel>
        ) : null}

        {view === "guides" ? <GuidesView /> : null}
      </div>

      <Dialog open={workspaceEditor.workspace !== null} onOpenChange={(next) => { if (!next) closeWorkspaceEditor() }}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workspace Front-End Settings</DialogTitle>
            <DialogDescription>
              Control the client association, front-end visibility, preview asset, products, and tags for this workspace. Saving mirrors the front-end fields onto the linked client when one exists.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-2">
            {workspaceEditor.workspace ? (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">{workspaceEditor.name || workspaceEditor.workspace.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{workspaceEditor.workspace.id}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Client: {workspaceEditor.workspace.clientId ? clientById.get(workspaceEditor.workspace.clientId)?.name || workspaceEditor.workspace.clientId : "Unlinked"}
                </p>
              </div>
            ) : null}

            {workspaceEditor.error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {workspaceEditor.error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Workspace title
              </label>
              <Input
                value={workspaceEditor.name}
                onChange={(event) =>
                  setWorkspaceEditor((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Workspace title"
              />
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox
                checked={workspaceEditor.showOnFrontend}
                onCheckedChange={(checked) =>
                  setWorkspaceEditor((current) => ({ ...current, showOnFrontend: checked === true }))
                }
              />
              <div>
                <p className="text-sm font-medium text-foreground">Show on front end</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, this workspace’s linked client can appear on <code>/work</code>.
                </p>
              </div>
            </label>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Linked client
              </label>
              <select
                value={workspaceEditor.clientId}
                onChange={(event) =>
                  setWorkspaceEditor((current) => {
                    const nextClientId = event.target.value
                    const nextClient = state.clients.find((client) => client.id === nextClientId)
                    return {
                      ...current,
                      clientId: nextClientId,
                      frontEndProducts: nextClient?.activeProducts.length
                        ? nextClient.activeProducts
                        : current.frontEndProducts,
                    }
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No linked client</option>
                {state.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.id})
                    {client.workspaceId === workspaceEditor.workspace?.id ? " - canonical" : ""}
                  </option>
                ))}
              </select>
              <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={workspaceEditor.setCanonicalForClient}
                  onCheckedChange={(checked) =>
                    setWorkspaceEditor((current) => ({
                      ...current,
                      setCanonicalForClient: checked === true,
                    }))
                  }
                  disabled={!workspaceEditor.clientId}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Set as canonical workspace</p>
                  <p className="text-xs text-muted-foreground">
                    Use this when the selected client should point to this workspace from the clients tab. Multiple workspaces can link to one client, but only one is canonical.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Public URL
                </label>
                {workspaceEditor.workspace?.suggestedPublicUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setWorkspaceEditor((current) => ({
                        ...current,
                        publicUrl: current.workspace?.suggestedPublicUrl || current.publicUrl,
                      }))
                    }
                  >
                    Use suggested URL
                  </Button>
                ) : null}
              </div>
              <Input
                value={workspaceEditor.publicUrl}
                onChange={(event) =>
                  setWorkspaceEditor((current) => ({ ...current, publicUrl: event.target.value }))
                }
                placeholder={workspaceEditor.workspace?.suggestedPublicUrl || "https://client-site.com"}
              />
              {workspaceEditor.workspace?.suggestedPublicUrl && !workspaceEditor.publicUrl ? (
                <p className="text-xs text-muted-foreground">
                  Suggested from current deploy data: {workspaceEditor.workspace.suggestedPublicUrl}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Preview image URL
              </label>
              <Input
                value={workspaceEditor.previewImageUrl}
                onChange={(event) =>
                  setWorkspaceEditor((current) => ({ ...current, previewImageUrl: event.target.value }))
                }
                placeholder="https://.../app-preview.png"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Use this for app or Xcode projects when a live site screenshot is not the right preview for <code>/work</code>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Products in use
              </label>
              <div className="flex flex-wrap gap-2">
                {ADMIN_PRODUCT_KEYS.map((productKey) => {
                  const active = workspaceEditor.frontEndProducts.includes(productKey)
                  return (
                    <button
                      key={productKey}
                      type="button"
                      onClick={() =>
                        setWorkspaceEditor((current) => ({
                          ...current,
                          frontEndProducts: current.frontEndProducts.includes(productKey)
                            ? current.frontEndProducts.filter((item) => item !== productKey)
                            : [...current.frontEndProducts, productKey],
                        }))
                      }
                      className={
                        active
                          ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm text-primary"
                          : "rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-muted/40"
                      }
                    >
                      {ADMIN_PRODUCT_LABELS[productKey]}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                These tags feed the <code>/work</code> “Products in use” badges for the linked client.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Showcase tags
              </label>
              <Input
                value={workspaceEditor.tagDraft}
                onChange={(event) =>
                  setWorkspaceEditor((current) => ({ ...current, tagDraft: event.target.value }))
                }
                onKeyDown={(event) => {
                  const raw = workspaceEditor.tagDraft.trim()
                  if (event.key !== "Enter" && event.key !== ",") return
                  event.preventDefault()
                  if (!raw) return
                  setWorkspaceEditor((current) => ({
                    ...current,
                    frontEndTags: current.frontEndTags.includes(raw)
                      ? current.frontEndTags
                      : [...current.frontEndTags, raw],
                    tagDraft: "",
                  }))
                }}
                placeholder="Type a tag and press Enter"
              />
              <div className="flex flex-wrap gap-2">
                {workspaceEditor.frontEndTags.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No showcase tags yet.</span>
                ) : (
                  workspaceEditor.frontEndTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setWorkspaceEditor((current) => ({
                          ...current,
                          frontEndTags: current.frontEndTags.filter((item) => item !== tag),
                        }))
                      }
                      className="rounded-full border border-border px-3 py-1 text-sm text-foreground hover:bg-muted/40"
                    >
                      {tag} ×
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                These power the filter chips on <code>/work</code> and mirror onto the linked client brands.
              </p>
            </div>

            {workspaceEditor.workspace ? (
              <WorkspaceQuestionnairesPanel
                workspaceId={workspaceEditor.workspace.id}
                workspaceName={workspaceEditor.workspace.name}
              />
            ) : null}
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={closeWorkspaceEditor} disabled={workspaceEditor.saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveWorkspaceVisibility()} disabled={workspaceEditor.saving}>
              {workspaceEditor.saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={workspaceRepoEditorOpen} onOpenChange={(next) => { if (!next) closeWorkspaceRepoEditor() }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Workspace Repos</DialogTitle>
            <DialogDescription>
              Associate GitHub repos to the selected workspace and linked client. Saving an already-connected repo moves that repo link here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {workspaceRepoEditorWorkspace ? (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">{workspaceRepoEditorWorkspace.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{workspaceRepoEditorWorkspace.id}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Client: {workspaceRepoEditorWorkspace.clientId ? clientById.get(workspaceRepoEditorWorkspace.clientId)?.name || workspaceRepoEditorWorkspace.clientId : "Link a client first"}
                </p>
              </div>
            ) : null}

            {workspaceRepoError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {workspaceRepoError}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Current repo links
              </label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {workspaceRepoLoading ? (
                  <p className="text-sm text-muted-foreground">Loading repo links...</p>
                ) : workspaceRepoLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No repo links for this workspace yet.</p>
                ) : (
                  workspaceRepoLinks.map((repoLink) => (
                    <div key={repoLink.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{repoLink.repoSlug}</p>
                        <p className="truncate text-xs text-muted-foreground">{repoLink.htmlUrl || repoLink.id}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void removeWorkspaceRepo(repoLink)}
                        disabled={workspaceRepoRemovingId === repoLink.id}
                      >
                        {workspaceRepoRemovingId === repoLink.id ? "Removing..." : "Remove"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Available GitHub repos
              </label>
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                {workspaceRepoLoading ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Loading GitHub repos...</p>
                ) : (
                  workspaceRepoOptions.map((repo) => {
                    const selected = workspaceRepoSelected.includes(repo.fullName.toLowerCase())
                    const currentLink = workspaceRepoLinks.find((link) => link.repoSlug.toLowerCase() === repo.fullName.toLowerCase())
                    const linkedElsewhere =
                      repo.alreadyConnected &&
                      !currentLink &&
                      repo.connectedClientId !== workspaceRepoEditorWorkspace?.clientId

                    return (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() =>
                          setWorkspaceRepoSelected((current) =>
                            current.includes(repo.fullName.toLowerCase())
                              ? current.filter((item) => item !== repo.fullName.toLowerCase())
                              : [...current, repo.fullName.toLowerCase()]
                          )
                        }
                        className={selected ? "flex w-full items-start justify-between gap-3 rounded-lg bg-primary/10 px-3 py-2 text-left" : "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted/40"}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{repo.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {currentLink
                              ? "Currently linked here"
                              : linkedElsewhere
                                ? `Currently connected to ${repo.connectedClientName || repo.connectedClientId || "another client"}`
                                : repo.description || "Available"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {currentLink ? <Badge variant="outline">Current</Badge> : null}
                          {linkedElsewhere ? <Badge variant="outline">Move on save</Badge> : null}
                          {repo.language ? <Badge variant="outline">{repo.language}</Badge> : null}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeWorkspaceRepoEditor} disabled={workspaceRepoSaving}>
              Close
            </Button>
            <Button onClick={() => void saveWorkspaceRepos()} disabled={workspaceRepoSaving || workspaceRepoSelected.length === 0}>
              {workspaceRepoSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save repo links
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RepoConnectModal
        open={repoConnectOpen}
        onOpenChange={setRepoConnectOpen}
        onCreated={() => {
          void loadOps()
        }}
      />

      <ClientManageModal
        open={manageClient !== null}
        onOpenChange={(next) => {
          if (!next) setManageClient(null)
        }}
        client={manageClient}
        clients={state.clients}
        people={state.people}
        workspaces={state.workspaces}
        onSaved={() => {
          void loadOps()
        }}
        onEditWorkspace={(workspaceId) => {
          const workspace = workspaceById.get(workspaceId)
          if (!workspace) return
          setManageClient(null)
          openWorkspaceEditor(workspace)
        }}
      />
    </DashboardLayout>
  )
}
