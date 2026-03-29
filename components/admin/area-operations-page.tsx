"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard-layout"
import type { ClientDirectoryEntry } from "@/lib/client-directory"
import {
  ADMIN_AREAS,
  type AdminAreaId,
  type AdminAreaSummary,
  type AdminVercelProject,
  getAreaSummary,
  getClientsForArea,
} from "@/lib/admin-operations"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"

type AreaOperationsPageProps = {
  areaId: AdminAreaId
  title: string
  description: string
  callout: string
  ctaHref?: string
  ctaLabel?: string
}

function emptyAreaSummary(areaId: AdminAreaId): AdminAreaSummary {
  const definition = ADMIN_AREAS.find((area) => area.id === areaId)
  if (!definition) {
    throw new Error(`Unknown admin area: ${areaId}`)
  }

  return {
    ...definition,
    trackedRecords: 0,
    websiteCount: 0,
    storyCount: 0,
    missingAssignments: 0,
  }
}

export function AreaOperationsPage({
  areaId,
  title,
  description,
  callout,
  ctaHref,
  ctaLabel,
}: AreaOperationsPageProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([])
  const [summary, setSummary] = useState<AdminAreaSummary>(emptyAreaSummary(areaId))

  const fetchAreaData = async () => {
    try {
      setRefreshing(true)
      setLoading(true)

      const [clientsResponse, vercelResponse] = await Promise.all([
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/vercel/projects", { cache: "no-store" }),
      ])

      const clientsPayload = clientsResponse.ok ? await clientsResponse.json() : { clients: [] }
      const vercelPayload = vercelResponse.ok ? await vercelResponse.json() : { projects: [] }

      const allClients = Array.isArray(clientsPayload.clients) ? (clientsPayload.clients as ClientDirectoryEntry[]) : []
      const vercelProjects = Array.isArray(vercelPayload.projects)
        ? (vercelPayload.projects as AdminVercelProject[])
        : []

      setClients(getClientsForArea(allClients, areaId))
      setSummary(getAreaSummary(allClients, vercelProjects, areaId))
    } catch (error) {
      console.error(`Failed to load ${areaId} area data:`, error)
      setClients([])
      setSummary(emptyAreaSummary(areaId))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchAreaData()
  }, [areaId])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <div className="flex gap-2">
            {ctaHref && ctaLabel ? (
              <Button variant="outline" asChild className="border-border/70 bg-card/80">
                <Link href={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="border-border/70 bg-card/80"
              onClick={() => void fetchAreaData()}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle>Operational Context</AdminPanelTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{callout}</p>
            <div className="grid gap-4 md:grid-cols-4">
              <AdminMetricTile
                label="Tracked Records"
                value={summary.trackedRecords}
                labelClassName="text-xs uppercase tracking-[0.2em]"
              />
              <AdminMetricTile
                label="Website Signals"
                value={summary.websiteCount}
                labelClassName="text-xs uppercase tracking-[0.2em]"
              />
              <AdminMetricTile
                label="Story Coverage"
                value={summary.storyCount}
                labelClassName="text-xs uppercase tracking-[0.2em]"
              />
              <AdminMetricTile
                label="Missing Assignments"
                value={summary.missingAssignments}
                labelClassName="text-xs uppercase tracking-[0.2em]"
              />
            </div>
          </CardContent>
        </AdminPanel>

        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle>Tracked Records</AdminPanelTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading records…</p>
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No records are currently classified into this area. The current classification remains heuristic and can
                be replaced later with explicit tags.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {clients.map((client) => (
                  <AdminPanelInset key={client.id}>
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{client.storyId}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-foreground/80">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Website</p>
                        <p>{client.websiteUrl || client.deployUrl || "Missing"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Story</p>
                        <p>{client.storyVideoUrl ? "Ready" : "Missing"}</p>
                      </div>
                    </div>
                  </AdminPanelInset>
                ))}
              </div>
            )}
          </CardContent>
        </AdminPanel>
      </div>
    </DashboardLayout>
  )
}
