"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Globe, RefreshCw, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CardContent, CardHeader } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard-layout"
import type { ClientDirectoryEntry } from "@/lib/client-directory"
import type { DiscoveredAppStoreApp } from "@/lib/app-store"
import type { AdminVercelProject } from "@/lib/admin-operations"
import { clientHasAppSignal, clientHasWebsiteSignal } from "@/lib/admin-operations"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"

export function WebDevelopmentOperationsPage() {
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([])
  const [vercelProjects, setVercelProjects] = useState<AdminVercelProject[]>([])
  const [apps, setApps] = useState<DiscoveredAppStoreApp[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [appStoreError, setAppStoreError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      setLoading(true)

      const [clientsResponse, vercelResponse, appsResponse] = await Promise.all([
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/vercel/projects", { cache: "no-store" }),
        fetch("/api/app-store/apps", { cache: "no-store" }),
      ])

      const clientsPayload = clientsResponse.ok ? await clientsResponse.json() : { clients: [] }
      const vercelPayload = vercelResponse.ok ? await vercelResponse.json() : { projects: [] }
      const appsPayload = await appsResponse.json().catch(() => ({ apps: [] }))

      setClients(Array.isArray(clientsPayload.clients) ? (clientsPayload.clients as ClientDirectoryEntry[]) : [])
      setVercelProjects(Array.isArray(vercelPayload.projects) ? (vercelPayload.projects as AdminVercelProject[]) : [])
      setApps(Array.isArray(appsPayload.apps) ? (appsPayload.apps as DiscoveredAppStoreApp[]) : [])
      setAppStoreError(appsResponse.ok && appsPayload?.success !== false ? null : appsPayload?.error || "Unable to load App Store data.")
    } catch (error) {
      console.error("Failed to load web development operations:", error)
      setClients([])
      setVercelProjects([])
      setApps([])
      setAppStoreError(error instanceof Error ? error.message : "Unable to load App Store data.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const websiteClients = useMemo(() => clients.filter((client) => clientHasWebsiteSignal(client)), [clients])
  const appClients = useMemo(() => clients.filter((client) => clientHasAppSignal(client)), [clients])
  const linkedApps = useMemo(() => apps.filter((app) => app.linkedClientId), [apps])
  const spotlightClients = useMemo(() => {
    return clients
      .filter((client) => clientHasWebsiteSignal(client) || clientHasAppSignal(client))
      .slice(0, 6)
  }, [clients])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Web Development</h1>
            <p className="text-muted-foreground">
              Website delivery plus App Store Connect visibility, so client workspaces can group web and app products together.
            </p>
          </div>
          <Button variant="outline" onClick={() => void fetchData()} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetricTile label="Website Clients" value={websiteClients.length} />
          <AdminMetricTile label="Detected Vercel Projects" value={vercelProjects.length} />
          <AdminMetricTile label="App-linked Clients" value={appClients.length} />
          <AdminMetricTile label="Detected Apple Apps" value={apps.length} hint={appStoreError || undefined} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Website Delivery
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vercel discovery, deployment matching, and client linking for website products.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <AdminPanelInset>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Linked Projects</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {vercelProjects.filter((project) => project.linkedClientId).length}
                  </p>
                </AdminPanelInset>
                <AdminPanelInset>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unmapped Projects</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {vercelProjects.filter((project) => !project.linkedClientId).length}
                  </p>
                </AdminPanelInset>
              </div>
              <Button asChild>
                <Link href="/dashboard/clients/vercel-sync">
                  Open Vercel Sync
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </AdminPanel>

          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                App Delivery
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                App Store Connect apps, latest builds, and TestFlight groups linked into client workspaces.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <AdminPanelInset>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Linked Apps</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{linkedApps.length}</p>
                </AdminPanelInset>
                <AdminPanelInset>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unmapped Apps</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {apps.filter((app) => !app.linkedClientId).length}
                  </p>
                </AdminPanelInset>
              </div>
              <Button asChild>
                <Link href="/dashboard/web-development/app-store-sync">
                  Open App Store Sync
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </AdminPanel>
        </div>

        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle>Client Product Coverage</AdminPanelTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading client coverage…</p>
            ) : spotlightClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No website or app records are linked yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {spotlightClients.map((client) => (
                  <AdminPanelInset key={client.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{client.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {clientHasWebsiteSignal(client) ? <Badge variant="secondary">Website</Badge> : null}
                        {clientHasAppSignal(client) ? <Badge className="bg-cyan-700 text-white">App</Badge> : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{client.storyId}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {client.appStoreConnectName || client.appStoreConnectBundleId || client.websiteUrl || client.deployUrl || "No linked product URLs yet"}
                    </p>
                    <Button variant="outline" asChild className="mt-4">
                      <Link href={`/dashboard/clients/${client.id}`}>Open Client Workspace</Link>
                    </Button>
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
