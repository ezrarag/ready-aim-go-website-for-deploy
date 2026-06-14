"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Film,
  ListTodo,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  getAdminHubHref,
  normalizeAdminHubView,
  type AdminHubView,
} from "@/lib/admin-navigation"
import {
  ADMIN_PRODUCT_KEYS,
  ADMIN_PRODUCT_LABELS,
  type AdminProductKey,
} from "@/lib/admin/products"
import type {
  AdminHubClient,
  AdminHubPayload,
  AdminHubPerson,
  AdminHubProject,
  AdminHubTask,
  AdminHubWarning,
  AdminHubWorkspace,
} from "@/lib/admin/ops-hub"
import type {
  WorkspaceDuplicateCluster,
  WorkspaceDuplicateMergePlan,
} from "@/lib/admin/workspace-duplicates"
import type { WorkspacePurgePlan } from "@/lib/admin/workspace-purge"

type AdminHubState = AdminHubPayload["data"] & {
  error: string | null
}

type VideoDiagnosticsRow = {
  driveFileId: string
  name: string
  modifiedTime: string | null
  parseMode: string
  parsedSlug: string | null
  matchedAlias: string | null
  status: "matched" | "already_processed" | "unmatched_client" | "unmatched_name" | "error" | string
  reason: string | null
  client: {
    id: string
    name: string
    storyId: string
    workspaceIds: string[]
    phoneReady: boolean
    statusVideoCount: number
  } | null
}

type VideoDiagnosticsPayload = {
  ok: boolean
  dryRun: boolean
  sinceHours: number
  folderScoped: boolean
  total: number
  processed: number
  skipped: number
  unmatched: number
  clientsIndexed: number
  rows: VideoDiagnosticsRow[]
  error?: string
  message?: string
}

type BuildVideoVisibilityStatus = "visible" | "missing_statusVideo" | "missing_workspace" | "unmatched"

type BuildVideoVisibilityRow = {
  markerId: string
  driveFileId: string
  originalName: string
  processedAt: string | null
  clientSlug: string | null
  clientId: string | null
  clientName: string | null
  statusVideoId: string | null
  statusVideoExists: boolean
  videoTitle: string | null
  storagePath: string | null
  linkedWorkspaceIds: string[]
  workspaceMappingExists: boolean
  sms: string
  status: BuildVideoVisibilityStatus
  recommendation: string | null
}

type BuildVideoVisibilityPayload = {
  rows: BuildVideoVisibilityRow[]
  loadedAt: string
}

type BuildVideoVerifyResult = {
  workspaceId: string
  clientId: string
  videoId: string
  candidateClientIds: string[]
  workspaceExists: boolean
  workspaceClientId: string | null
  statusVideoExists: boolean
  shouldAppear: boolean
  message: string
}

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

function formatDate(value: string | null | undefined) {
  if (!value) return "No date"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Never"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
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

function videoStatusClass(status: string) {
  if (status === "matched") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (status === "already_processed") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  if (status === "error") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function buildVideoVisibilityClass(status: BuildVideoVisibilityStatus) {
  if (status === "visible") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (status === "missing_statusVideo") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
  if (status === "missing_workspace") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"
}

function formatBuildVideoStatus(status: BuildVideoVisibilityStatus) {
  if (status === "missing_statusVideo") return "missing statusVideo"
  if (status === "missing_workspace") return "missing workspace"
  return status
}

function warningClass(severity: AdminHubWarning["severity"]) {
  return severity === "danger"
    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
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

function SubscriptionGrid({ client }: { client: AdminHubClient }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {ADMIN_PRODUCT_KEYS.map((product) => {
        const subscription = client.subscriptions[product]
        return (
          <div key={product} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{ADMIN_PRODUCT_LABELS[product]}</p>
              <Badge className={statusClass(subscription.status)}>
                {subscription.status}
              </Badge>
            </div>
            <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
              {subscription.planId || (subscription.legacy ? "Legacy module fallback" : "No plan")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Renewal {formatDate(subscription.renewalAt)}
            </p>
          </div>
        )
      })}
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
  const selectedClientId = searchParams.get("clientId")
  const [state, setState] = useState<AdminHubState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [duplicateClusters, setDuplicateClusters] = useState<WorkspaceDuplicateCluster[]>([])
  const [duplicateAuditError, setDuplicateAuditError] = useState<string | null>(null)
  const [mergePreview, setMergePreview] = useState<WorkspaceDuplicateMergePlan | null>(null)
  const [mergePreviewLoading, setMergePreviewLoading] = useState<string | null>(null)
  const [purgePreview, setPurgePreview] = useState<WorkspacePurgePlan | null>(null)
  const [purgingWorkspaceId, setPurgingWorkspaceId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [taskStatus, setTaskStatus] = useState("open")
  const [videoDiagnostics, setVideoDiagnostics] = useState<VideoDiagnosticsPayload | null>(null)
  const [videoDiagnosticsLoading, setVideoDiagnosticsLoading] = useState(false)
  const [videoDiagnosticsError, setVideoDiagnosticsError] = useState<string | null>(null)
  const [videoLiveScanRunning, setVideoLiveScanRunning] = useState(false)
  const [videoLiveScanResult, setVideoLiveScanResult] = useState<{ processed: number; skipped: number; error?: string } | null>(null)
  const [buildVideoVisibility, setBuildVideoVisibility] = useState<BuildVideoVisibilityPayload | null>(null)
  const [buildVideoVisibilityLoading, setBuildVideoVisibilityLoading] = useState(false)
  const [buildVideoVisibilityError, setBuildVideoVisibilityError] = useState<string | null>(null)
  const [buildVideoClientFilter, setBuildVideoClientFilter] = useState("")
  const [buildVideoWorkspaceFilter, setBuildVideoWorkspaceFilter] = useState("")
  const [buildVideoStatusFilter, setBuildVideoStatusFilter] = useState<"all" | BuildVideoVisibilityStatus>("all")
  const [buildVideoVerifyingKey, setBuildVideoVerifyingKey] = useState<string | null>(null)
  const [buildVideoVerifyResults, setBuildVideoVerifyResults] = useState<Record<string, BuildVideoVerifyResult>>({})

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
      setDuplicateAuditError(null)
    } catch (error) {
      setDuplicateClusters([])
      setDuplicateAuditError(error instanceof Error ? error.message : "Unable to load duplicate audit.")
    }
  }

  const loadBuildVideoVisibility = async () => {
    setBuildVideoVisibilityLoading(true)
    setBuildVideoVisibilityError(null)
    try {
      const response = await fetch("/api/admin/build-video-visibility?limit=75", { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Build video visibility returned ${response.status}`)
      }
      setBuildVideoVisibility(payload.data as BuildVideoVisibilityPayload)
    } catch (error) {
      setBuildVideoVisibility(null)
      setBuildVideoVisibilityError(error instanceof Error ? error.message : "Unable to load build video visibility.")
    } finally {
      setBuildVideoVisibilityLoading(false)
    }
  }

  useEffect(() => {
    void loadOps()
    void loadDuplicateAudit()
    void loadBuildVideoVisibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedClient = useMemo(
    () => state.clients.find((client) => client.id === selectedClientId) ?? state.clients[0] ?? null,
    [selectedClientId, state.clients]
  )
  const openTasks = useMemo(() => state.tasks.filter(isOpenTask), [state.tasks])
  const blockedTasks = useMemo(() => openTasks.filter(isBlockedTask), [openTasks])
  const unassignedPeople = useMemo(
    () => state.people.filter((person) => person.status === "pending" || person.clientIds.length === 0),
    [state.people]
  )
  const activeSubscriptions = useMemo(
    () =>
      state.clients.reduce(
        (count, client) =>
          count + ADMIN_PRODUCT_KEYS.filter((product) => {
            const status = client.subscriptions[product].status
            return status === "active" || status === "trialing"
          }).length,
        0
      ),
    [state.clients]
  )
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
        searchText([person.name, person.email, person.role, person.clientIds, person.activeClientId], search)
      ),
    [state.people, search]
  )
  const visibleWorkspaces = useMemo(
    () =>
      state.workspaces.filter((workspace) =>
        searchText([workspace.name, workspace.id, workspace.clientId, workspace.ownerUid], search)
      ),
    [state.workspaces, search]
  )
  const visibleProjects = useMemo(
    () =>
      state.projects.filter((project) =>
        searchText([project.name, project.clientName, project.clientId, project.workspaceId, project.githubRepos, project.product], search)
      ),
    [state.projects, search]
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
  const visibleBuildVideoRows = useMemo(() => {
    const clientFilter = buildVideoClientFilter.trim().toLowerCase()
    const workspaceFilter = buildVideoWorkspaceFilter.trim().toLowerCase()

    return (buildVideoVisibility?.rows ?? []).filter((row) => {
      const matchesClient =
        !clientFilter ||
        [row.clientSlug, row.clientId, row.clientName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(clientFilter)
      const matchesWorkspace =
        !workspaceFilter ||
        row.linkedWorkspaceIds.some((workspaceId) => workspaceId.toLowerCase().includes(workspaceFilter))
      const matchesStatus = buildVideoStatusFilter === "all" || row.status === buildVideoStatusFilter

      return matchesClient && matchesWorkspace && matchesStatus
    })
  }, [buildVideoClientFilter, buildVideoStatusFilter, buildVideoVisibility?.rows, buildVideoWorkspaceFilter])

  const setView = (nextView: AdminHubView) => router.push(getAdminHubHref(nextView))

  const previewDuplicateMerge = async (cluster: WorkspaceDuplicateCluster) => {
    setMergePreviewLoading(cluster.id)
    setMergePreview(null)
    try {
      const response = await fetch("/api/admin/workspace-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonicalWorkspaceId: cluster.canonicalWorkspaceId,
          duplicateWorkspaceIds: cluster.duplicateWorkspaceIds,
          dryRun: true,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Dry-run returned ${response.status}`)
      }
      setMergePreview(payload.data as WorkspaceDuplicateMergePlan)
    } catch (error) {
      setMergePreview({
        dryRun: true,
        canonicalWorkspaceId: cluster.canonicalWorkspaceId,
        duplicateWorkspaceIds: cluster.duplicateWorkspaceIds,
        references: [
          {
            collection: "workspaces",
            docId: cluster.canonicalWorkspaceId,
            field: "dryRunError",
            from: [],
            to: [error instanceof Error ? error.message : "Unable to build dry-run merge plan."],
          },
        ],
        memberCopies: [],
        duplicateArchiveWrites: [],
      })
    } finally {
      setMergePreviewLoading(null)
    }
  }

  const runLiveVideoScan = async () => {
    if (!window.confirm("This will download and process matching Drive recordings now. Continue?")) return
    setVideoLiveScanRunning(true)
    setVideoLiveScanResult(null)
    try {
      const response = await fetch("/api/videos/scan-drive?sinceHours=72", { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      setVideoLiveScanResult({
        processed: payload.processed ?? 0,
        skipped: payload.skipped ?? 0,
        error: payload.ok === false ? (payload.error ?? "Scan failed") : undefined,
      })
    } catch (error) {
      setVideoLiveScanResult({ processed: 0, skipped: 0, error: error instanceof Error ? error.message : "Scan failed" })
    } finally {
      setVideoLiveScanRunning(false)
    }
  }

  const runVideoDiagnostics = async () => {
    setVideoDiagnosticsLoading(true)
    setVideoDiagnosticsError(null)
    try {
      const response = await fetch("/api/videos/scan-drive?dryRun=true&sinceHours=72", {
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || `Drive dry-run returned ${response.status}`)
      }
      setVideoDiagnostics(payload as VideoDiagnosticsPayload)
    } catch (error) {
      setVideoDiagnostics(null)
      setVideoDiagnosticsError(
        error instanceof Error ? error.message : "Unable to run video diagnostics."
      )
    } finally {
      setVideoDiagnosticsLoading(false)
    }
  }

  const getBuildVideoVerifyWorkspaceId = (row: BuildVideoVisibilityRow) => {
    const workspaceFilter = buildVideoWorkspaceFilter.trim().toLowerCase()
    if (!workspaceFilter) return row.linkedWorkspaceIds[0] || ""
    return (
      row.linkedWorkspaceIds.find((workspaceId) => workspaceId.toLowerCase() === workspaceFilter) ||
      row.linkedWorkspaceIds.find((workspaceId) => workspaceId.toLowerCase().includes(workspaceFilter)) ||
      row.linkedWorkspaceIds[0] ||
      ""
    )
  }

  const verifyBuildVideoPortalVisibility = async (row: BuildVideoVisibilityRow) => {
    const workspaceId = getBuildVideoVerifyWorkspaceId(row)
    if (!workspaceId || !row.clientId || !row.statusVideoId) return

    const verifyKey = `${row.markerId}:${workspaceId}`
    setBuildVideoVerifyingKey(verifyKey)
    try {
      const params = new URLSearchParams({
        verify: "portal",
        workspaceId,
        clientId: row.clientId,
        videoId: row.statusVideoId,
      })
      const response = await fetch(`/api/admin/build-video-visibility?${params.toString()}`, { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Portal verification returned ${response.status}`)
      }
      setBuildVideoVerifyResults((current) => ({
        ...current,
        [row.markerId]: payload.data as BuildVideoVerifyResult,
      }))
    } catch (error) {
      setBuildVideoVerifyResults((current) => ({
        ...current,
        [row.markerId]: {
          workspaceId,
          clientId: row.clientId || "",
          videoId: row.statusVideoId || "",
          candidateClientIds: [],
          workspaceExists: false,
          workspaceClientId: null,
          statusVideoExists: false,
          shouldAppear: false,
          message: error instanceof Error ? error.message : "Unable to verify portal visibility.",
        },
      }))
    } finally {
      setBuildVideoVerifyingKey(null)
    }
  }

  const purgeWorkspace = async (workspace: AdminHubWorkspace) => {
    setPurgingWorkspaceId(workspace.id)
    setPurgePreview(null)
    try {
      const previewResponse = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspace.id)}/purge`, {
        cache: "no-store",
      })
      const previewPayload = await previewResponse.json().catch(() => ({}))
      if (!previewResponse.ok || previewPayload?.success !== true) {
        throw new Error(previewPayload?.error || `Purge preview returned ${previewResponse.status}`)
      }
      const preview = previewPayload.data as WorkspacePurgePlan
      setPurgePreview(preview)
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
      setPurgePreview(payload.data as WorkspacePurgePlan)
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <AdminMetricTile label="Clients" value={loading ? "..." : state.clients.length} trailing={<Building2 className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="People" value={loading ? "..." : state.people.length} hint={`${unassignedPeople.length} pending`} trailing={<Users className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Workspaces" value={loading ? "..." : state.workspaces.length} trailing={<BriefcaseBusiness className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Open Work" value={loading ? "..." : openTasks.length} hint={`${blockedTasks.length} blocked`} trailing={<ListTodo className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Subscriptions" value={loading ? "..." : activeSubscriptions} hint="Active product lines" trailing={<CircleDollarSign className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Warnings" value={loading ? "..." : state.warnings.length} trailing={<AlertTriangle className="h-5 w-5 text-muted-foreground" />} />
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
              {(["overview", "clients", "people", "workspaces", "tasks", "billing"] as AdminHubView[]).map((item) => (
                <Button key={item} variant={view === item ? "default" : "outline"} onClick={() => setView(item)}>
                  {item === "overview" ? "Overview" : item.charAt(0).toUpperCase() + item.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </AdminPanel>

        {view === "overview" ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle>Attention Queue</AdminPanelTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.warnings.length === 0 ? (
                  <AdminPanelInset className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    No operational warnings.
                  </AdminPanelInset>
                ) : (
                  state.warnings.slice(0, 12).map((warning) => (
                    <Link key={warning.id} href={getAdminHubHref(warning.view, { clientId: warning.clientId })} className="block">
                      <AdminPanelInset className={`p-3 transition hover:bg-muted/40 ${warningClass(warning.severity)}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{warning.label}</p>
                            <p className="mt-1 line-clamp-2 text-sm opacity-85">{warning.detail}</p>
                          </div>
                          <Badge variant="outline">{warning.view}</Badge>
                        </div>
                      </AdminPanelInset>
                    </Link>
                  ))
                )}
              </CardContent>
            </AdminPanel>

            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle>Current Operating Picture</AdminPanelTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AdminPanelInset className="p-3">
                  <p className="text-sm font-medium text-foreground">Unassigned portal people</p>
                  <div className="mt-2 space-y-2">
                    {unassignedPeople.slice(0, 5).map((person) => (
                      <div key={person.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{person.name}</span>
                        <Badge className={statusClass(person.status)}>{person.status}</Badge>
                      </div>
                    ))}
                    {unassignedPeople.length === 0 ? <p className="text-sm text-muted-foreground">No pending people.</p> : null}
                  </div>
                </AdminPanelInset>
                <AdminPanelInset className="p-3">
                  <p className="text-sm font-medium text-foreground">Blocked work</p>
                  <div className="mt-2 space-y-2">
                    {blockedTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="text-sm">
                        <p className="truncate font-medium">{task.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{task.clientName || task.clientId || "No client"}</p>
                      </div>
                    ))}
                    {blockedTasks.length === 0 ? <p className="text-sm text-muted-foreground">No blocked work.</p> : null}
                  </div>
                </AdminPanelInset>
                <p className="text-xs text-muted-foreground">Loaded {formatDateTime(state.loadedAt)}</p>
              </CardContent>
            </AdminPanel>
          </div>
        ) : null}

        {view === "clients" ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <AdminPanel className="overflow-hidden">
              <CardHeader>
                <AdminPanelTitle>Clients</AdminPanelTitle>
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
                      </tr>
                    </thead>
                    <tbody>
                      {visibleClients.length === 0 ? (
                        <EmptyRow colSpan={5} label={loading ? "Loading clients..." : "No clients match this view."} />
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
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </AdminPanel>

            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle>{selectedClient?.name ?? "Client Detail"}</AdminPanelTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedClient ? (
                  <>
                    <div className="grid gap-3 text-sm">
                      <AdminPanelInset className="p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                        <Badge className={`mt-2 ${statusClass(selectedClient.status)}`}>{selectedClient.status}</Badge>
                      </AdminPanelInset>
                      <AdminPanelInset className="p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Links</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="truncate">{selectedClient.websiteUrl || selectedClient.deployUrl || "No public URL"}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">{selectedClient.portalEmail || selectedClient.contactEmail || "No portal email"}</p>
                        </div>
                      </AdminPanelInset>
                    </div>
                    <SubscriptionGrid client={selectedClient} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No client selected.</p>
                )}
              </CardContent>
            </AdminPanel>
          </div>
        ) : null}

        {view === "people" ? (
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
        ) : null}

        {view === "workspaces" ? (
          <div className="space-y-5">
            <AdminPanel>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <AdminPanelTitle>Duplicate Workspace Audit</AdminPanelTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Read-only duplicate detection across workspace names, client links, domains, repos, Vercel projects, and references.
                  </p>
                </div>
                <Badge variant="outline">{duplicateClusters.length} cluster{duplicateClusters.length === 1 ? "" : "s"}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {duplicateAuditError ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                    {duplicateAuditError}
                  </div>
                ) : duplicateClusters.length === 0 ? (
                  <AdminPanelInset className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    No duplicate workspace clusters found by the current audit.
                  </AdminPanelInset>
                ) : (
                  duplicateClusters.slice(0, 6).map((cluster) => (
                    <AdminPanelInset key={cluster.id} className="p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              Canonical {cluster.canonicalWorkspaceId}
                            </Badge>
                            {cluster.duplicateWorkspaceIds.map((workspaceId) => (
                              <Badge key={workspaceId} className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                Duplicate {workspaceId}
                              </Badge>
                            ))}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Reasons: {cluster.reasons.slice(0, 4).join(", ") || "shared workspace signals"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void previewDuplicateMerge(cluster)}
                          disabled={mergePreviewLoading === cluster.id}
                        >
                          {mergePreviewLoading === cluster.id ? "Building..." : "Dry-run Merge"}
                        </Button>
                      </div>
                    </AdminPanelInset>
                  ))
                )}

                {mergePreview ? (
                  <AdminPanelInset className="p-3">
                    <p className="text-sm font-medium text-foreground">
                      Dry-run merge into {mergePreview.canonicalWorkspaceId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {mergePreview.references.length} reference rewrite{mergePreview.references.length === 1 ? "" : "s"}, {mergePreview.memberCopies.length} member copy operation{mergePreview.memberCopies.length === 1 ? "" : "s"}, {mergePreview.duplicateArchiveWrites.length} duplicate archive write{mergePreview.duplicateArchiveWrites.length === 1 ? "" : "s"}.
                    </p>
                    <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-xs text-muted-foreground">
                      {mergePreview.references.slice(0, 12).map((reference) => (
                        <div key={`${reference.collection}:${reference.docId}:${reference.field}`}>
                          {reference.collection}/{reference.docId}.{reference.field}: {reference.from.join(", ") || "-"} -&gt; {reference.to.join(", ") || "-"}
                        </div>
                      ))}
                      {mergePreview.references.length > 12 ? <div>...{mergePreview.references.length - 12} more reference rewrites</div> : null}
                    </div>
                  </AdminPanelInset>
                ) : null}

                {purgePreview ? (
                  <AdminPanelInset className="p-3">
                    <p className="text-sm font-medium text-foreground">
                      Purge {purgePreview.dryRun ? "preview" : "result"} for {purgePreview.workspaceId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {purgePreview.userUpdates.length} user update{purgePreview.userUpdates.length === 1 ? "" : "s"}, {purgePreview.clientUpdates.length} client update{purgePreview.clientUpdates.length === 1 ? "" : "s"}, {purgePreview.projectDeletes.length} project delete{purgePreview.projectDeletes.length === 1 ? "" : "s"}, {purgePreview.taskDeletes.length} task delete{purgePreview.taskDeletes.length === 1 ? "" : "s"}.
                    </p>
                  </AdminPanelInset>
                ) : null}
              </CardContent>
            </AdminPanel>

            <AdminPanel>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <AdminPanelTitle>Video Updates Diagnostics</AdminPanelTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dry-run Google Drive discovery against clients, linked workspaces, existing update videos, and SMS readiness.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void runVideoDiagnostics()}
                    disabled={videoDiagnosticsLoading || videoLiveScanRunning}
                  >
                    {videoDiagnosticsLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Film className="mr-2 h-4 w-4" />
                    )}
                    Dry-run Scan
                  </Button>
                  <Button
                    onClick={() => void runLiveVideoScan()}
                    disabled={videoLiveScanRunning || videoDiagnosticsLoading}
                  >
                    {videoLiveScanRunning ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Film className="mr-2 h-4 w-4" />
                    )}
                    Trigger Live Scan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {videoDiagnosticsError ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                    {videoDiagnosticsError}
                  </div>
                ) : null}

                {videoLiveScanResult ? (
                  <div className={`rounded-lg border p-3 text-sm ${videoLiveScanResult.error ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
                    {videoLiveScanResult.error
                      ? `Live scan error: ${videoLiveScanResult.error}`
                      : `Live scan complete — ${videoLiveScanResult.processed} processed, ${videoLiveScanResult.skipped} skipped. Reload the client portal Updates tab to see new videos.`}
                  </div>
                ) : null}

                {videoDiagnostics ? (
                  <div className="grid gap-2 md:grid-cols-4">
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Drive Files</p>
                      <p className="mt-1 text-2xl font-semibold">{videoDiagnostics.total}</p>
                    </AdminPanelInset>
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Matched</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {videoDiagnostics.rows.filter((row) => row.status === "matched").length}
                      </p>
                    </AdminPanelInset>
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Unmatched</p>
                      <p className="mt-1 text-2xl font-semibold">{videoDiagnostics.unmatched}</p>
                    </AdminPanelInset>
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Indexed Clients</p>
                      <p className="mt-1 text-2xl font-semibold">{videoDiagnostics.clientsIndexed}</p>
                    </AdminPanelInset>
                  </div>
                ) : null}

                {!videoDiagnostics && !videoDiagnosticsError ? (
                  <AdminPanelInset className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Film className="h-4 w-4" />
                    Run a dry scan to see whether recent Drive uploads can land in the portal Updates tab.
                  </AdminPanelInset>
                ) : null}

                {videoDiagnostics?.rows.length === 0 ? (
                  <AdminPanelInset className="text-sm text-muted-foreground">
                    {videoDiagnostics.message || "No recent Drive recordings found in the scan window."}
                  </AdminPanelInset>
                ) : null}

                {videoDiagnostics && videoDiagnostics.rows.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Drive Upload</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Client Match</th>
                          <th className="px-4 py-3 font-medium">Workspaces</th>
                          <th className="px-4 py-3 font-medium">Updates / SMS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videoDiagnostics.rows.map((row) => (
                          <tr key={row.driveFileId} className="border-b border-border last:border-0">
                            <td className="px-4 py-3">
                              <p className="line-clamp-1 font-medium text-foreground">{row.name}</p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {row.parseMode} · {formatDateTime(row.modifiedTime)}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={videoStatusClass(row.status)}>
                                {row.status.replaceAll("_", " ")}
                              </Badge>
                              {row.reason ? (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.reason}</p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              {row.client ? (
                                <>
                                  <p className="font-medium text-foreground">{row.client.name}</p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {row.client.id} · {row.client.storyId}
                                  </p>
                                </>
                              ) : (
                                <p className="text-muted-foreground">
                                  {row.parsedSlug ? `No client for ${row.parsedSlug}` : "No slug parsed"}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {row.client?.workspaceIds.length ? (
                                  row.client.workspaceIds.map((workspaceId) => (
                                    <Badge key={workspaceId} variant="outline" className="rounded-md">
                                      {workspaceId}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">No linked workspace</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <p>{row.client?.statusVideoCount ?? 0} status video{(row.client?.statusVideoCount ?? 0) === 1 ? "" : "s"}</p>
                              <p className={row.client?.phoneReady ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}>
                                {row.client?.phoneReady ? "SMS phone ready" : "No SMS phone"}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </AdminPanel>

            <AdminPanel>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <AdminPanelTitle>Build Video Visibility</AdminPanelTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Read-only audit of processed Drive markers, client statusVideos, and the workspaces that can surface them in portal Updates.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void loadBuildVideoVisibility()}
                  disabled={buildVideoVisibilityLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${buildVideoVisibilityLoading ? "animate-spin" : ""}`} />
                  Refresh Visibility
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {buildVideoVisibilityError ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                    {buildVideoVisibilityError}
                  </div>
                ) : null}

                <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={buildVideoClientFilter}
                    onChange={(event) => setBuildVideoClientFilter(event.target.value)}
                    placeholder="Filter by client slug or client ID"
                  />
                  <Input
                    value={buildVideoWorkspaceFilter}
                    onChange={(event) => setBuildVideoWorkspaceFilter(event.target.value)}
                    placeholder="Filter by workspace ID"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(["all", "visible", "missing_statusVideo", "missing_workspace", "unmatched"] as const).map((status) => (
                      <Button
                        key={status}
                        variant={buildVideoStatusFilter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBuildVideoStatusFilter(status)}
                      >
                        {status === "all" ? "All" : formatBuildVideoStatus(status)}
                      </Button>
                    ))}
                  </div>
                </div>

                {buildVideoVisibility ? (
                  <div className="grid gap-2 md:grid-cols-4">
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Processed Markers</p>
                      <p className="mt-1 text-2xl font-semibold">{buildVideoVisibility.rows.length}</p>
                    </AdminPanelInset>
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Portal Visible</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {buildVideoVisibility.rows.filter((row) => row.status === "visible").length}
                      </p>
                    </AdminPanelInset>
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Missing statusVideo</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {buildVideoVisibility.rows.filter((row) => row.status === "missing_statusVideo").length}
                      </p>
                    </AdminPanelInset>
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Missing Workspace</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {buildVideoVisibility.rows.filter((row) => row.status === "missing_workspace").length}
                      </p>
                    </AdminPanelInset>
                  </div>
                ) : null}

                {!buildVideoVisibility && !buildVideoVisibilityError ? (
                  <AdminPanelInset className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Film className="h-4 w-4" />
                    Loading recent processed Drive markers and portal visibility joins.
                  </AdminPanelInset>
                ) : null}

                {buildVideoVisibility && visibleBuildVideoRows.length === 0 ? (
                  <AdminPanelInset className="text-sm text-muted-foreground">
                    No processed build videos match the current filters.
                  </AdminPanelInset>
                ) : null}

                {visibleBuildVideoRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[1280px] text-sm">
                      <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Drive Marker</th>
                          <th className="px-4 py-3 font-medium">Client</th>
                          <th className="px-4 py-3 font-medium">Portal statusVideo</th>
                          <th className="px-4 py-3 font-medium">Storage</th>
                          <th className="px-4 py-3 font-medium">Workspaces</th>
                          <th className="px-4 py-3 font-medium">Visibility</th>
                          <th className="px-4 py-3 font-medium">Verify</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleBuildVideoRows.map((row) => {
                          const verifyWorkspaceId = getBuildVideoVerifyWorkspaceId(row)
                          const verifyKey = `${row.markerId}:${verifyWorkspaceId}`
                          const verifyResult = buildVideoVerifyResults[row.markerId]
                          const canVerify = Boolean(verifyWorkspaceId && row.clientId && row.statusVideoId)

                          return (
                            <tr key={row.markerId} className="border-b border-border last:border-0">
                              <td className="px-4 py-3 align-top">
                                <p className="line-clamp-1 font-medium text-foreground">{row.originalName}</p>
                                <p className="font-mono text-xs text-muted-foreground">{row.driveFileId}</p>
                                <p className="text-xs text-muted-foreground">Processed {formatDateTime(row.processedAt)}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                {row.clientId ? (
                                  <>
                                    <p className="font-medium text-foreground">{row.clientSlug || row.clientName || row.clientId}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{row.clientId}</p>
                                  </>
                                ) : (
                                  <p className="text-muted-foreground">Unmatched marker</p>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="line-clamp-1 font-medium text-foreground">{row.videoTitle || "No title"}</p>
                                <p className="font-mono text-xs text-muted-foreground">
                                  {row.statusVideoId ? `clients/${row.clientId ?? "{clientId}"}/statusVideos/${row.statusVideoId}` : "No statusVideo ID on marker"}
                                </p>
                                <p className={row.statusVideoExists ? "text-xs text-emerald-600 dark:text-emerald-300" : "text-xs text-red-600 dark:text-red-300"}>
                                  {row.statusVideoExists ? "status video document exists" : "status video document missing"}
                                </p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="max-w-[260px] break-all font-mono text-xs text-muted-foreground">
                                  {row.storagePath || "No storage path"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">SMS {row.sms}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-wrap gap-1.5">
                                  {row.linkedWorkspaceIds.length ? (
                                    row.linkedWorkspaceIds.map((workspaceId) => (
                                      <Badge key={workspaceId} variant="outline" className="rounded-md">
                                        {workspaceId}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No linked workspace</span>
                                  )}
                                </div>
                                <p className={row.workspaceMappingExists ? "mt-1 text-xs text-emerald-600 dark:text-emerald-300" : "mt-1 text-xs text-amber-600 dark:text-amber-300"}>
                                  {row.workspaceMappingExists ? "workspace mapping exists" : "workspace mapping missing"}
                                </p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <Badge className={buildVideoVisibilityClass(row.status)}>
                                  {formatBuildVideoStatus(row.status)}
                                </Badge>
                                {row.recommendation ? (
                                  <p className="mt-2 max-w-[300px] text-xs text-muted-foreground">{row.recommendation}</p>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground">Drive discovered and processed into portal-visible Firestore.</p>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void verifyBuildVideoPortalVisibility(row)}
                                  disabled={!canVerify || buildVideoVerifyingKey === verifyKey}
                                >
                                  {buildVideoVerifyingKey === verifyKey ? (
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  Verify Portal Visibility
                                </Button>
                                <p className="mt-1 font-mono text-xs text-muted-foreground">
                                  {verifyWorkspaceId ? `workspace ${verifyWorkspaceId}` : "No workspace to verify"}
                                </p>
                                {verifyResult ? (
                                  <div className={`mt-2 rounded-md border p-2 text-xs ${verifyResult.shouldAppear ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                                    <p>{verifyResult.message}</p>
                                    <p className="mt-1 font-mono">
                                      candidates: {verifyResult.candidateClientIds.join(", ") || "none"}
                                    </p>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </AdminPanel>

            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <AdminPanel className="overflow-hidden">
              <CardHeader>
                <AdminPanelTitle>Workspaces</AdminPanelTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Workspace</th>
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Repos</th>
                        <th className="px-4 py-3 font-medium">Members</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleWorkspaces.length === 0 ? (
                        <EmptyRow colSpan={5} label={loading ? "Loading workspaces..." : "No workspaces match this view."} />
                      ) : (
                        visibleWorkspaces.map((workspace) => (
                          <tr key={workspace.id} className="border-b border-border transition hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{workspace.name}</p>
                                {duplicateClusterByWorkspaceId.has(workspace.id) ? (
                                  workspace.id === duplicateClusterByWorkspaceId.get(workspace.id)?.canonicalWorkspaceId ? (
                                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Canonical</Badge>
                                  ) : (
                                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">Duplicate</Badge>
                                  )
                                ) : null}
                              </div>
                              <p className="font-mono text-xs text-muted-foreground">{workspace.id}</p>
                            </td>
                            <td className="px-4 py-3">{workspace.clientId ? clientById.get(workspace.clientId)?.name || workspace.clientId : "Unlinked"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{workspace.repoCount} repos / {workspace.vercelCount} deploys</td>
                            <td className="px-4 py-3 text-muted-foreground">{workspace.memberCount}</td>
                            <td className="px-4 py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void purgeWorkspace(workspace)}
                                disabled={purgingWorkspaceId === workspace.id}
                                className="border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-300"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {purgingWorkspaceId === workspace.id ? "Purging..." : "Purge"}
                              </Button>
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
                <AdminPanelTitle>Projects</AdminPanelTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="border-y border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Project</th>
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Workspace</th>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleProjects.length === 0 ? (
                        <EmptyRow colSpan={5} label={loading ? "Loading projects..." : "No projects match this view."} />
                      ) : (
                        visibleProjects.map((project: AdminHubProject) => (
                          <tr key={project.id} className="border-b border-border transition hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{project.name}</p>
                              <p className="truncate font-mono text-xs text-muted-foreground">{project.githubRepos[0] || project.id}</p>
                            </td>
                            <td className="px-4 py-3">{project.clientId ? clientById.get(project.clientId)?.name || project.clientName || project.clientId : "Unlinked"}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{project.workspaceId ? workspaceById.get(project.workspaceId)?.name || project.workspaceId : "Missing"}</td>
                            <td className="px-4 py-3">{project.product ? ADMIN_PRODUCT_LABELS[project.product] : "Unassigned"}</td>
                            <td className="px-4 py-3"><Badge className={statusClass(project.status)}>{project.status}</Badge></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </AdminPanel>
            </div>
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
      </div>
    </DashboardLayout>
  )
}
