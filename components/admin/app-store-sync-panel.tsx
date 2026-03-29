"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Link2, PlusCircle, RefreshCw, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ClientDirectoryEntry } from "@/lib/client-directory"
import type { DiscoveredAppStoreApp } from "@/lib/app-store"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"

type Client = ClientDirectoryEntry
type AppStoreWebhookEvent = {
  id: string
  createdAt?: string
  summary?: {
    eventType?: string
    appId?: string
    resourceType?: string
    state?: string
    feedbackType?: string
  }
  syncMode?: string
  syncError?: string | null
  syncedClientIds?: string[]
}

export function AppStoreSyncPanel() {
  const [clients, setClients] = useState<Client[]>([])
  const [apps, setApps] = useState<DiscoveredAppStoreApp[]>([])
  const [webhookEvents, setWebhookEvents] = useState<AppStoreWebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [appsLoading, setAppsLoading] = useState(true)
  const [appsError, setAppsError] = useState<string | null>(null)
  const [webhookEventsError, setWebhookEventsError] = useState<string | null>(null)
  const [appClientLinks, setAppClientLinks] = useState<Record<string, string>>({})
  const [actionAppId, setActionAppId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "linked" | "unlinked">("all")
  const [platformFilter, setPlatformFilter] = useState<"all" | "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS" | "WATCH_OS" | "unknown">("all")
  const [buildStateFilter, setBuildStateFilter] = useState<"all" | "PROCESSING" | "VALID" | "FAILED" | "INVALID" | "unknown">("all")

  const fetchClientsData = async () => {
    const clientsResponse = await fetch("/api/clients", { cache: "no-store" })
    if (!clientsResponse.ok) return []
    const payload = await clientsResponse.json()
    return payload?.success && Array.isArray(payload.clients) ? (payload.clients as Client[]) : []
  }

  const fetchApps = async () => {
    setAppsLoading(true)
    setAppsError(null)

    try {
      const response = await fetch("/api/app-store/apps", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to fetch App Store apps")
      }

      const nextApps = Array.isArray(payload.apps) ? (payload.apps as DiscoveredAppStoreApp[]) : []
      setApps(nextApps)
      setAppClientLinks((prev) => {
        const next = { ...prev }
        for (const app of nextApps) {
          if (!next[app.id] && app.linkedClientId) {
            next[app.id] = app.linkedClientId
          }
        }
        return next
      })
    } catch (error) {
      console.error("Error fetching App Store apps:", error)
      setAppsError(error instanceof Error ? error.message : "Failed to fetch App Store apps")
      setApps([])
    } finally {
      setAppsLoading(false)
    }
  }

  const fetchWebhookEvents = async () => {
    setWebhookEventsError(null)

    try {
      const response = await fetch("/api/app-store/webhook-events", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to fetch App Store webhook events")
      }

      setWebhookEvents(Array.isArray(payload.events) ? (payload.events as AppStoreWebhookEvent[]) : [])
    } catch (error) {
      console.error("Error fetching App Store webhook events:", error)
      setWebhookEventsError(error instanceof Error ? error.message : "Failed to fetch App Store webhook events")
      setWebhookEvents([])
    }
  }

  const refreshData = async () => {
    try {
      setLoading(true)
      const loadedClients = await fetchClientsData()
      setClients(loadedClients)
      await Promise.all([fetchApps(), fetchWebhookEvents()])
    } catch (error) {
      console.error("Error refreshing App Store sync data:", error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshData()
  }, [])

  const handleAttachApp = async (appId: string, mode: "create" | "link") => {
    if (mode === "link" && !appClientLinks[appId]) {
      alert("Select a client first")
      return
    }

    setActionAppId(appId)
    try {
      const response = await fetch("/api/app-store/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          mode,
          clientId: mode === "link" ? appClientLinks[appId] : undefined,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to attach App Store app")
      }
      await refreshData()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to attach App Store app")
    } finally {
      setActionAppId(null)
    }
  }

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const searchable = [app.name, app.bundleId, app.sku, app.linkedClientName, app.latestVersionString, app.latestBuildNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      if (searchTerm && !searchable.includes(searchTerm.toLowerCase())) return false
      if (assignmentFilter === "linked" && !app.linkedClientId) return false
      if (assignmentFilter === "unlinked" && app.linkedClientId) return false
      if (platformFilter === "unknown" && app.platform) return false
      if (platformFilter !== "all" && platformFilter !== "unknown" && app.platform !== platformFilter) return false
      if (buildStateFilter === "unknown" && app.buildState) return false
      if (buildStateFilter !== "all" && buildStateFilter !== "unknown" && app.buildState !== buildStateFilter) return false
      return true
    })
  }, [apps, assignmentFilter, buildStateFilter, platformFilter, searchTerm])

  const unlinkedApps = filteredApps.filter((app) => !app.linkedClientId)
  const appLinkedClients = clients.filter((client) => client.appStoreConnectAppId || client.appStoreConnectBundleId || client.appStoreConnectName)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">App Store Sync</h1>
          <p className="text-muted-foreground">
            App Store Connect apps, latest build status, TestFlight groups, and client linking for mobile delivery.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refreshData()} disabled={appsLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${appsLoading ? "animate-spin" : ""}`} />
          Refresh App Store
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricTile label="Detected Apps" value={apps.length} />
        <AdminMetricTile label="Linked Apps" value={apps.filter((app) => app.linkedClientId).length} />
        <AdminMetricTile label="Unmapped Apps" value={unlinkedApps.length} />
        <AdminMetricTile label="App-linked Clients" value={appLinkedClients.length} hint={webhookEvents.length > 0 ? `${webhookEvents.length} recent webhook deliveries` : undefined} />
      </div>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>App Filters</AdminPanelTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Search app, bundle ID, build, or linked client..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={assignmentFilter} onValueChange={(value: "all" | "linked" | "unlinked") => setAssignmentFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Assignment filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignments</SelectItem>
              <SelectItem value="linked">Linked only</SelectItem>
              <SelectItem value="unlinked">Unlinked only</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={platformFilter}
            onValueChange={(value: "all" | "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS" | "WATCH_OS" | "unknown") =>
              setPlatformFilter(value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Platform filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="IOS">iOS</SelectItem>
              <SelectItem value="MAC_OS">macOS</SelectItem>
              <SelectItem value="TV_OS">tvOS</SelectItem>
              <SelectItem value="VISION_OS">visionOS</SelectItem>
              <SelectItem value="WATCH_OS">watchOS</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={buildStateFilter}
            onValueChange={(value: "all" | "PROCESSING" | "VALID" | "FAILED" | "INVALID" | "unknown") =>
              setBuildStateFilter(value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Build state filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All build states</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="VALID">Valid</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="INVALID">Invalid</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </AdminPanel>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Discovery And Linking</AdminPanelTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appsError ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
              {appsError}
            </div>
          ) : null}

          {appsLoading ? (
            <p className="text-sm text-muted-foreground">Loading App Store apps…</p>
          ) : unlinkedApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unlinked App Store apps match the current filters.</p>
          ) : (
            <div className="space-y-3">
              {unlinkedApps.map((app) => (
                <AdminPanelInset key={app.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{app.name}</p>
                        <Badge variant="secondary">{app.platform || "unknown"}</Badge>
                        <Badge variant="outline">{app.buildState || "no build"}</Badge>
                        {app.betaGroups.length > 0 ? <Badge className="bg-cyan-700 text-white">{app.betaGroups.length} TestFlight group{app.betaGroups.length === 1 ? "" : "s"}</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">Bundle ID: {app.bundleId}</p>
                      {app.latestVersionString || app.latestBuildNumber ? (
                        <p className="text-sm text-muted-foreground">
                          Latest build: {app.latestVersionString || "?"} ({app.latestBuildNumber || "?"})
                        </p>
                      ) : null}
                      {app.betaGroups.length > 0 ? (
                        <p className="text-xs text-muted-foreground">Beta groups: {app.betaGroups.join(", ")}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No TestFlight groups detected yet.</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 lg:w-[320px]">
                      <Select
                        value={appClientLinks[app.id] || ""}
                        onValueChange={(value) => setAppClientLinks((prev) => ({ ...prev, [app.id]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Link to existing client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAttachApp(app.id, "link")}
                          disabled={actionAppId === app.id}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Link
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => handleAttachApp(app.id, "create")}
                          disabled={actionAppId === app.id}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Client
                        </Button>
                      </div>
                    </div>
                  </div>
                </AdminPanelInset>
              ))}
            </div>
          )}
        </CardContent>
      </AdminPanel>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Webhook Activity</AdminPanelTitle>
        </CardHeader>
        <CardContent>
          {webhookEventsError ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
              {webhookEventsError}
            </div>
          ) : null}
          {webhookEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No App Store Connect webhook deliveries logged yet.
            </p>
          ) : (
            <div className="space-y-3">
              {webhookEvents.map((event) => (
                <AdminPanelInset key={event.id}>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{event.summary?.eventType || "unknown"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.summary?.resourceType || "resource"} {event.summary?.state ? `· ${event.summary.state}` : ""}
                        {event.summary?.feedbackType ? ` · ${event.summary.feedbackType}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{event.syncMode || "unknown"}</Badge>
                      <Badge variant="secondary">{event.syncedClientIds?.length ?? 0} client syncs</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {event.createdAt || "Unknown time"}
                    {event.summary?.appId ? ` · app ${event.summary.appId}` : ""}
                  </p>
                  {event.syncError ? (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">{event.syncError}</p>
                  ) : null}
                </AdminPanelInset>
              ))}
            </div>
          )}
        </CardContent>
      </AdminPanel>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Client App Links</AdminPanelTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading clients…</p>
          ) : appLinkedClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients have App Store Connect links yet.</p>
          ) : (
            <div className="space-y-3">
              {appLinkedClients.map((client) => (
                <AdminPanelInset
                  key={client.id}
                  className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.appStoreConnectName || client.appStoreConnectBundleId || client.appStoreUrl || "No app mapped yet"}
                    </p>
                    {client.appStoreConnectVersionString || client.appStoreConnectBuildNumber ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Latest build: {client.appStoreConnectVersionString || "?"} ({client.appStoreConnectBuildNumber || "?"})
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/clients/${client.id}`}>View Client</Link>
                    </Button>
                  </div>
                </AdminPanelInset>
              ))}
            </div>
          )}
        </CardContent>
      </AdminPanel>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Detected Apps</AdminPanelTitle>
        </CardHeader>
        <CardContent>
          {appsLoading ? (
            <p className="text-sm text-muted-foreground">Loading detected apps…</p>
          ) : filteredApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No App Store apps found.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredApps.map((app) => (
                <AdminPanelInset key={app.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{app.name}</p>
                    <Badge variant="outline">{app.linkedClientName ? "linked" : "unmapped"}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{app.platform || "unknown"}</Badge>
                    <Badge variant="outline">{app.buildState || "no build"}</Badge>
                    {app.betaGroups.length > 0 ? (
                      <Badge className="bg-cyan-700 text-white">
                        <Smartphone className="mr-1 h-3.5 w-3.5" />
                        TestFlight
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{app.linkedClientName || app.bundleId}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {app.latestVersionString || "?"} ({app.latestBuildNumber || "?"})
                  </p>
                </AdminPanelInset>
              ))}
            </div>
          )}
        </CardContent>
      </AdminPanel>
    </div>
  )
}
