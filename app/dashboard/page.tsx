"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Brain, RefreshCw, ShieldCheck, Siren, Waves, Workflow } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import type { ClientDirectoryEntry } from "@/lib/client-directory"
import {
  ADMIN_AREAS,
  countPulseEventsForArea,
  getAreaSummary,
  getOperationalAlerts,
  getClientsForArea,
  type AdminPulseEvent,
  type AdminVercelProject,
} from "@/lib/admin-operations"

type PulseSourceResponse = {
  source?: string
  totalEvents?: number
  events?: AdminPulseEvent[]
  error?: string
}

type SourceHealth = {
  id: string
  label: string
  totalEvents: number
  error?: string
}

type OperationsState = {
  totalClients: number
  linkedProjects: number
  totalProjects: number
  unlinkedProjects: number
  sourceStatuses: SourceHealth[]
  sourceEventTotal: number
  alerts: string[]
  webSummary: ReturnType<typeof getAreaSummary>
  beamSummary: ReturnType<typeof getAreaSummary>
  allAreaSummaries: Array<ReturnType<typeof getAreaSummary>>
  webNotifications: number
  beamNotifications: number
  beamStoryGaps: number
  webCoverageGaps: number
  lastUpdated: string
}

const SOURCE_LABELS: Record<string, string> = {
  slack: "Slack",
  github: "GitHub",
  vercel: "Vercel Pulse",
}

function emptyAreaSummary(areaId: Parameters<typeof getAreaSummary>[2]) {
  return getAreaSummary([], [], areaId)
}

function createEmptyOperationsState(): OperationsState {
  return {
    totalClients: 0,
    linkedProjects: 0,
    totalProjects: 0,
    unlinkedProjects: 0,
    sourceStatuses: [],
    sourceEventTotal: 0,
    alerts: [],
    webSummary: emptyAreaSummary("web-development"),
    beamSummary: emptyAreaSummary("beam-participants"),
    allAreaSummaries: ADMIN_AREAS.map((area) => getAreaSummary([], [], area.id)),
    webNotifications: 0,
    beamNotifications: 0,
    beamStoryGaps: 0,
    webCoverageGaps: 0,
    lastUpdated: new Date().toISOString(),
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [operations, setOperations] = useState<OperationsState>(createEmptyOperationsState)

  useEffect(() => {
    // TODO: Firebase Auth session check
    setAuthChecked(true)
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    void fetchOperations()
  }, [authChecked])

  const fetchOperations = async () => {
    try {
      setRefreshing(true)
      setLoading(true)

      const [clientsResponse, vercelProjectsResponse, ...sourceResponses] = await Promise.allSettled([
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/vercel/projects", { cache: "no-store" }),
        fetch("/api/pulse/slack", { cache: "no-store" }),
        fetch("/api/pulse/github", { cache: "no-store" }),
        fetch("/api/pulse/vercel", { cache: "no-store" }),
      ])

      let clients: ClientDirectoryEntry[] = []
      if (clientsResponse.status === "fulfilled" && clientsResponse.value.ok) {
        const payload = await clientsResponse.value.json()
        clients = Array.isArray(payload.clients) ? (payload.clients as ClientDirectoryEntry[]) : []
      }

      let vercelProjects: AdminVercelProject[] = []
      if (vercelProjectsResponse.status === "fulfilled" && vercelProjectsResponse.value.ok) {
        const payload = await vercelProjectsResponse.value.json()
        vercelProjects = Array.isArray(payload.projects) ? (payload.projects as AdminVercelProject[]) : []
      }

      const sourceStatuses: SourceHealth[] = []
      const pulseEvents: AdminPulseEvent[] = []

      for (const response of sourceResponses) {
        if (response.status !== "fulfilled") continue

        const payload = (await response.value.json()) as PulseSourceResponse
        const totalEvents = typeof payload.totalEvents === "number" ? payload.totalEvents : 0
        const id = payload.source ?? "source"

        sourceStatuses.push({
          id,
          label: SOURCE_LABELS[id] ?? id,
          totalEvents,
          error: payload.error,
        })

        if (Array.isArray(payload.events)) {
          pulseEvents.push(...payload.events.map((event) => ({ ...event, source: payload.source ?? event.source })))
        }
      }

      const webSummary = getAreaSummary(clients, vercelProjects, "web-development")
      const beamSummary = getAreaSummary(clients, vercelProjects, "beam-participants")
      const linkedProjects = vercelProjects.filter((project) => project.linkedClientId).length
      const allAreaSummaries = ADMIN_AREAS.map((area) => getAreaSummary(clients, vercelProjects, area.id))
      const beamClients = getClientsForArea(clients, "beam-participants")

      setOperations({
        totalClients: clients.length,
        linkedProjects,
        totalProjects: vercelProjects.length,
        unlinkedProjects: vercelProjects.filter((project) => !project.linkedClientId).length,
        sourceStatuses,
        sourceEventTotal: sourceStatuses.reduce((sum, source) => sum + source.totalEvents, 0),
        alerts: getOperationalAlerts(clients, vercelProjects),
        webSummary,
        beamSummary,
        allAreaSummaries,
        webNotifications: countPulseEventsForArea(pulseEvents, "web-development"),
        beamNotifications: countPulseEventsForArea(pulseEvents, "beam-participants"),
        beamStoryGaps: beamClients.filter((client) => !client.storyVideoUrl?.trim()).length,
        webCoverageGaps: webSummary.trackedRecords - webSummary.websiteCount,
        lastUpdated: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error fetching dashboard operations:", error)
      setOperations(createEmptyOperationsState())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (!authChecked) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
            <p className="text-muted-foreground">
              Sync health, website aggregation, BEAM participant aggregation, assignment gaps, and source health.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-border/70 bg-card/80"
            onClick={() => void fetchOperations()}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Operations
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetricTile
            label="Sync Health"
            value={operations.totalProjects === 0 ? "0" : `${operations.linkedProjects}/${operations.totalProjects}`}
            hint="Linked Vercel projects to client records"
          />
          <AdminMetricTile
            label="Website Aggregation"
            value={
              operations.webSummary.trackedRecords === 0
                ? "0"
                : `${operations.webSummary.websiteCount}/${operations.webSummary.trackedRecords}`
            }
            hint={`${operations.webNotifications} website-oriented notification(s)`}
          />
          <AdminMetricTile
            label="BEAM Aggregation"
            value={
              operations.beamSummary.trackedRecords === 0
                ? "0"
                : `${operations.beamSummary.storyCount}/${operations.beamSummary.trackedRecords}`
            }
            hint={`${operations.beamNotifications} BEAM-oriented notification(s)`}
          />
          <AdminMetricTile
            label="Alerts / Warnings"
            value={operations.alerts.length}
            hint={`${operations.unlinkedProjects} unmapped Vercel project(s)`}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Sync Health
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <AdminMetricTile label="Linked Projects" value={operations.linkedProjects} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
              <AdminMetricTile label="Unmapped Projects" value={operations.unlinkedProjects} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
              <AdminMetricTile label="Clients Tracked" value={operations.totalClients} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
              <AdminMetricTile label="Source Events" value={operations.sourceEventTotal} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
            </CardContent>
          </AdminPanel>

          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Website Aggregation Status
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <AdminMetricTile label="Tracked Web Records" value={operations.webSummary.trackedRecords} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
                <AdminMetricTile label="Website Signals" value={operations.webSummary.websiteCount} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
                <AdminMetricTile label="Coverage Gaps" value={operations.webCoverageGaps} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
              </div>
              <Button variant="outline" asChild className="border-border/70 bg-card/80">
                <Link href="/dashboard/web-development">
                  Open Web Development
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </AdminPanel>

          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5" />
                BEAM Participant Aggregation Status
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <AdminMetricTile label="Tracked Participants" value={operations.beamSummary.trackedRecords} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
                <AdminMetricTile label="Story Coverage" value={operations.beamSummary.storyCount} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
                <AdminMetricTile label="Participant Gaps" value={operations.beamStoryGaps} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
              </div>
              <Button variant="outline" asChild className="border-border/70 bg-card/80">
                <Link href="/dashboard/beam-participants">
                  Open BEAM Participants
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </AdminPanel>

          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Ingestion / Source Health
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {operations.sourceStatuses.map((source) => (
                <AdminPanelInset key={source.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{source.label}</p>
                    <p className="text-sm text-muted-foreground">{source.totalEvents}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{source.error ? source.error : "Source responding"}</p>
                </AdminPanelInset>
              ))}
            </CardContent>
          </AdminPanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Assignment Gaps
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <AdminMetricTile label="Missing Client Assignments" value={operations.unlinkedProjects} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
              <AdminMetricTile label="Missing Website Assignments" value={operations.webCoverageGaps} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
              <AdminMetricTile label="Missing Participant Assignments" value={operations.beamSummary.missingAssignments} labelClassName="text-xs uppercase tracking-[0.2em]" valueClassName="text-2xl" />
            </CardContent>
          </AdminPanel>

          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Siren className="h-5 w-5" />
                Alerts / Warnings
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {operations.alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active warnings detected from the current heuristics.</p>
              ) : (
                operations.alerts.map((alert) => (
                  <div key={alert} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
                    {alert}
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground">
                Last refreshed {new Date(operations.lastUpdated).toLocaleString()}
              </p>
            </CardContent>
          </AdminPanel>
        </div>

        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle>Area Coverage</AdminPanelTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {operations.allAreaSummaries.map((summary) => (
              <AdminPanelInset key={summary.id}>
                <p className="font-medium text-foreground">{summary.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{summary.description}</p>
                <div className="mt-4 space-y-1 text-sm text-foreground/80">
                  <p>Records: {summary.trackedRecords}</p>
                  <p>Websites: {summary.websiteCount}</p>
                  <p>Stories: {summary.storyCount}</p>
                  <p>Unmapped: {summary.missingAssignments}</p>
                </div>
              </AdminPanelInset>
            ))}
          </CardContent>
        </AdminPanel>

        {!loading && operations.totalClients === 0 ? (
          <AdminPanel>
            <CardContent className="p-6 text-sm text-muted-foreground">
              There are no client records loaded yet, so this operations overview is currently showing empty-state health only.
            </CardContent>
          </AdminPanel>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
