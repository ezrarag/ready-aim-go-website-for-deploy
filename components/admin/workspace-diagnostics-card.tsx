"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Film, RefreshCw } from "lucide-react"

import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type {
  WorkspaceDuplicateCluster,
  WorkspaceDuplicateMergePlan,
} from "@/lib/admin/workspace-duplicates"

type VideoDiagnosticsRow = {
  driveFileId: string
  name: string
  modifiedTime: string | null
  parseMode: string
  status: string
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
  total: number
  unmatched: number
  clientsIndexed: number
  rows: VideoDiagnosticsRow[]
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Never"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
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

export function WorkspaceDiagnosticsCard() {
  const [duplicateClusters, setDuplicateClusters] = useState<WorkspaceDuplicateCluster[]>([])
  const [duplicateAuditError, setDuplicateAuditError] = useState<string | null>(null)
  const [mergePreview, setMergePreview] = useState<WorkspaceDuplicateMergePlan | null>(null)
  const [mergePreviewLoading, setMergePreviewLoading] = useState<string | null>(null)
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
    void loadDuplicateAudit()
    void loadBuildVideoVisibility()
  }, [])

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
    } catch {
      setMergePreview(null)
    } finally {
      setMergePreviewLoading(null)
    }
  }

  const runVideoDiagnostics = async () => {
    setVideoDiagnosticsLoading(true)
    setVideoDiagnosticsError(null)
    try {
      const response = await fetch("/api/videos/scan-drive?dryRun=true&sinceHours=72", { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || `Drive dry-run returned ${response.status}`)
      }
      setVideoDiagnostics(payload as VideoDiagnosticsPayload)
    } catch (error) {
      setVideoDiagnostics(null)
      setVideoDiagnosticsError(error instanceof Error ? error.message : "Unable to run video diagnostics.")
    } finally {
      setVideoDiagnosticsLoading(false)
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
      setBuildVideoVerifyResults((current) => ({ ...current, [row.markerId]: payload.data as BuildVideoVerifyResult }))
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

  return (
    <div className="space-y-6">
      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Workspace Diagnostics</AdminPanelTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Duplicate audit, Drive video scan diagnostics, and portal video visibility.
          </p>
        </CardHeader>
      </AdminPanel>

      <AdminPanel>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <AdminPanelTitle>Duplicate Workspace Audit</AdminPanelTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Read-only clustering across names, repos, domains, and linked references.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadDuplicateAudit()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Audit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {duplicateAuditError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{duplicateAuditError}</div>
          ) : duplicateClusters.length === 0 ? (
            <AdminPanelInset className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              No duplicate workspace clusters found by the current audit.
            </AdminPanelInset>
          ) : (
            duplicateClusters.slice(0, 8).map((cluster) => (
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
                  <Button variant="outline" size="sm" onClick={() => void previewDuplicateMerge(cluster)} disabled={mergePreviewLoading === cluster.id}>
                    {mergePreviewLoading === cluster.id ? "Building..." : "Dry-run Merge"}
                  </Button>
                </div>
              </AdminPanelInset>
            ))
          )}
          {mergePreview ? (
            <AdminPanelInset className="p-3">
              <p className="text-sm font-medium text-foreground">Dry-run merge into {mergePreview.canonicalWorkspaceId}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {mergePreview.references.length} reference rewrite{mergePreview.references.length === 1 ? "" : "s"}, {mergePreview.memberCopies.length} member copy operation{mergePreview.memberCopies.length === 1 ? "" : "s"}.
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
            <Button variant="outline" onClick={() => void runVideoDiagnostics()} disabled={videoDiagnosticsLoading || videoLiveScanRunning}>
              <Film className="mr-2 h-4 w-4" />
              Dry-run Scan
            </Button>
            <Button onClick={() => void runLiveVideoScan()} disabled={videoLiveScanRunning || videoDiagnosticsLoading}>
              <Film className="mr-2 h-4 w-4" />
              Trigger Live Scan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {videoDiagnosticsError ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{videoDiagnosticsError}</div> : null}
          {videoLiveScanResult ? <div className={`rounded-lg border p-3 text-sm ${videoLiveScanResult.error ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>{videoLiveScanResult.error ? `Live scan error: ${videoLiveScanResult.error}` : `Live scan complete — ${videoLiveScanResult.processed} processed, ${videoLiveScanResult.skipped} skipped.`}</div> : null}
          {videoDiagnostics ? (
            <div className="grid gap-2 md:grid-cols-4">
              <AdminMetricTile label="Drive Files" value={videoDiagnostics.total} />
              <AdminMetricTile label="Matched" value={videoDiagnostics.rows.filter((row) => row.status === "matched").length} />
              <AdminMetricTile label="Unmatched" value={videoDiagnostics.unmatched} />
              <AdminMetricTile label="Indexed Clients" value={videoDiagnostics.clientsIndexed} />
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
          <Button variant="outline" onClick={() => void loadBuildVideoVisibility()} disabled={buildVideoVisibilityLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${buildVideoVisibilityLoading ? "animate-spin" : ""}`} />
            Refresh Visibility
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {buildVideoVisibilityError ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{buildVideoVisibilityError}</div> : null}
          <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
            <Input value={buildVideoClientFilter} onChange={(event) => setBuildVideoClientFilter(event.target.value)} placeholder="Filter by client slug or client ID" />
            <Input value={buildVideoWorkspaceFilter} onChange={(event) => setBuildVideoWorkspaceFilter(event.target.value)} placeholder="Filter by workspace ID" />
            <div className="flex flex-wrap gap-2">
              {(["all", "visible", "missing_statusVideo", "missing_workspace", "unmatched"] as const).map((status) => (
                <Button key={status} variant={buildVideoStatusFilter === status ? "default" : "outline"} size="sm" onClick={() => setBuildVideoStatusFilter(status)}>
                  {status === "all" ? "All" : formatBuildVideoStatus(status)}
                </Button>
              ))}
            </div>
          </div>
          {visibleBuildVideoRows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[1180px] text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Drive Marker</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Portal statusVideo</th>
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
                          <p className="font-medium text-foreground">{row.clientSlug || row.clientName || row.clientId || "Unmatched marker"}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="line-clamp-1 font-medium text-foreground">{row.videoTitle || "No title"}</p>
                          <Badge className={row.statusVideoExists ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"}>
                            {row.statusVideoExists ? "status video exists" : "status video missing"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            {row.linkedWorkspaceIds.length ? row.linkedWorkspaceIds.map((workspaceId) => <Badge key={workspaceId} variant="outline" className="rounded-md">{workspaceId}</Badge>) : <span className="text-xs text-muted-foreground">No linked workspace</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Badge className={buildVideoVisibilityClass(row.status)}>{formatBuildVideoStatus(row.status)}</Badge>
                          {row.recommendation ? <p className="mt-2 max-w-[280px] text-xs text-muted-foreground">{row.recommendation}</p> : null}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Button variant="outline" size="sm" onClick={() => void verifyBuildVideoPortalVisibility(row)} disabled={!canVerify || buildVideoVerifyingKey === verifyKey}>
                            {buildVideoVerifyingKey === verifyKey ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Verify
                          </Button>
                          {verifyResult ? <p className="mt-2 text-xs text-muted-foreground">{verifyResult.message}</p> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminPanelInset className="text-sm text-muted-foreground">
              {buildVideoVisibility ? "No processed build videos match the current filters." : "Loading recent processed Drive markers and portal visibility joins."}
            </AdminPanelInset>
          )}
        </CardContent>
      </AdminPanel>
    </div>
  )
}
