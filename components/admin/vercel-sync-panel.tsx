"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Link2, PlusCircle, RefreshCw } from "lucide-react"
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
import {
  ADMIN_AREAS,
  findBeamDirectoryMatchesForProject,
  clientHasWebsiteSignal,
  type AdminBeamDirectoryEntry,
  getVercelProjectPrimaryArea,
  type AdminVercelProject,
} from "@/lib/admin-operations"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"

type Client = ClientDirectoryEntry
 
export function VercelSyncPanel() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [vercelProjects, setVercelProjects] = useState<AdminVercelProject[]>([])
  const [beamEntries, setBeamEntries] = useState<AdminBeamDirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [vercelLoading, setVercelLoading] = useState(true)
  const [beamLoading, setBeamLoading] = useState(true)
  const [vercelError, setVercelError] = useState<string | null>(null)
  const [beamError, setBeamError] = useState<string | null>(null)
  const [projectClientLinks, setProjectClientLinks] = useState<Record<string, string>>({})
  const [vercelActionProjectId, setVercelActionProjectId] = useState<string | null>(null)
  const [syncingAllVercel, setSyncingAllVercel] = useState(false)
  const [syncingClientId, setSyncingClientId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "linked" | "unlinked">("all")
  const [areaFilter, setAreaFilter] = useState<"all" | "web-development" | "transportation" | "real-estate" | "staff" | "beam-participants">("all")
  const [stateFilter, setStateFilter] = useState<"all" | "READY" | "BUILDING" | "ERROR" | "CANCELED" | "unknown">("all")
  const [beamPresenceFilter, setBeamPresenceFilter] = useState<"all" | "on-beam-home" | "not-on-beam-home">("all")

  const fetchClientsData = async () => {
    const clientsResponse = await fetch("/api/clients", { cache: "no-store" })
    if (!clientsResponse.ok) return []
    const payload = await clientsResponse.json()
    return payload?.success && Array.isArray(payload.clients) ? (payload.clients as Client[]) : []
  }

  const fetchVercelProjects = async () => {
    setVercelLoading(true)
    setVercelError(null)

    try {
      const response = await fetch("/api/vercel/projects", { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to fetch Vercel projects")
      }

      const projects = Array.isArray(payload.projects) ? (payload.projects as AdminVercelProject[]) : []
      setVercelProjects(projects)
      setProjectClientLinks((prev) => {
        const next = { ...prev }
        for (const project of projects) {
          if (!next[project.id] && project.linkedClientId) {
            next[project.id] = project.linkedClientId
          }
        }
        return next
      })
    } catch (error) {
      console.error("Error fetching Vercel projects:", error)
      setVercelError(error instanceof Error ? error.message : "Failed to fetch Vercel projects")
      setVercelProjects([])
    } finally {
      setVercelLoading(false)
    }
  }

  const fetchBeamEntries = async () => {
    setBeamLoading(true)
    setBeamError(null)

    try {
      const response = await fetch("/api/beam/website-directory/internal", { cache: "no-store" })
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to fetch BEAM Home sites")
      }

      const entries = Array.isArray(payload.entries) ? (payload.entries as AdminBeamDirectoryEntry[]) : []
      setBeamEntries(entries)
    } catch (error) {
      console.error("Error fetching BEAM directory entries:", error)
      setBeamError(error instanceof Error ? error.message : "Failed to fetch BEAM Home sites")
      setBeamEntries([])
    } finally {
      setBeamLoading(false)
    }
  }

  const refreshData = async () => {
    try {
      setLoading(true)
      const loadedClients = await fetchClientsData()
      setClients(loadedClients)
      await Promise.all([fetchVercelProjects(), fetchBeamEntries()])
    } catch (error) {
      console.error("Error refreshing Vercel sync data:", error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshData()
  }, [])

  const handleSyncClientFromVercel = async (clientId: string) => {
    setSyncingClientId(clientId)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/sync-vercel`, {
        method: "POST",
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to sync client from Vercel")
      }
      await refreshData()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to sync client from Vercel")
    } finally {
      setSyncingClientId(null)
    }
  }

  const handleSyncAllVercel = async () => {
    setSyncingAllVercel(true)
    try {
      const response = await fetch("/api/clients/sync/vercel", {
        method: "POST",
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to sync all clients from Vercel")
      }
      await refreshData()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to sync all clients from Vercel")
    } finally {
      setSyncingAllVercel(false)
    }
  }

  const handleAttachVercelProject = async (projectId: string, mode: "create" | "link") => {
    if (mode === "link" && !projectClientLinks[projectId]) {
      alert("Select a client first")
      return
    }

    setVercelActionProjectId(projectId)
    try {
      const response = await fetch("/api/vercel/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          mode,
          clientId: mode === "link" ? projectClientLinks[projectId] : undefined,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to attach Vercel project")
      }
      if (mode === "create" && typeof payload.clientId === "string" && payload.clientId) {
        router.push(`/dashboard/clients/${encodeURIComponent(payload.clientId)}`)
        return
      }
      await refreshData()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to attach Vercel project")
    } finally {
      setVercelActionProjectId(null)
    }
  }

  const beamMatchesByProjectId = new Map(
    vercelProjects.map((project) => [project.id, findBeamDirectoryMatchesForProject(project, beamEntries)])
  )
  const beamMatchedProjectCount = vercelProjects.filter((project) => (beamMatchesByProjectId.get(project.id) ?? []).length > 0).length

  const filteredProjects = vercelProjects.filter((project) => {
    const searchable = [
      project.name,
      project.repoSlug,
      project.productionUrl,
      project.linkedClientName,
      ...project.domains,
      ...project.customDomains,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    if (searchTerm && !searchable.includes(searchTerm.toLowerCase())) return false
    if (assignmentFilter === "linked" && !project.linkedClientId) return false
    if (assignmentFilter === "unlinked" && project.linkedClientId) return false
    if (areaFilter !== "all" && getVercelProjectPrimaryArea(project) !== areaFilter) return false
    if (stateFilter === "unknown" && project.deploymentState) return false
    if (stateFilter !== "all" && stateFilter !== "unknown" && project.deploymentState !== stateFilter) return false
    const beamMatches = beamMatchesByProjectId.get(project.id) ?? []
    if (beamPresenceFilter === "on-beam-home" && beamMatches.length === 0) return false
    if (beamPresenceFilter === "not-on-beam-home" && beamMatches.length > 0) return false
    return true
  })

  const unlinkedProjects = filteredProjects.filter((project) => !project.linkedClientId)
  const websiteClients = clients.filter((client) => clientHasWebsiteSignal(client))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vercel Sync</h1>
          <p className="text-muted-foreground">
            Discovery, linking, sync controls, and deployment matching for client websites.
          </p>
        </div>
        <Button variant="outline" onClick={handleSyncAllVercel} disabled={syncingAllVercel}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncingAllVercel ? "animate-spin" : ""}`} />
          {syncingAllVercel ? "Syncing…" : "Sync All Clients"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <AdminMetricTile label="Detected Projects" value={vercelProjects.length} />
        <AdminMetricTile
          label="Linked Projects"
          value={vercelProjects.filter((project) => project.linkedClientId).length}
        />
        <AdminMetricTile label="Unmapped Projects" value={unlinkedProjects.length} />
        <AdminMetricTile label="On BEAM Home" value={beamMatchedProjectCount} />
        <AdminMetricTile label="Website Clients" value={websiteClients.length} />
      </div>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Website Directory Filters</AdminPanelTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Input
            placeholder="Search name, repo, domain, or linked client..."
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
            value={areaFilter}
            onValueChange={(value: "all" | "web-development" | "transportation" | "real-estate" | "staff" | "beam-participants") =>
              setAreaFilter(value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Area filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {ADMIN_AREAS.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={stateFilter}
            onValueChange={(value: "all" | "READY" | "BUILDING" | "ERROR" | "CANCELED" | "unknown") => setStateFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Deployment state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="READY">Ready</SelectItem>
              <SelectItem value="BUILDING">Building</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
              <SelectItem value="CANCELED">Canceled</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={beamPresenceFilter}
            onValueChange={(value: "all" | "on-beam-home" | "not-on-beam-home") => setBeamPresenceFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="BEAM Home presence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All BEAM presence</SelectItem>
              <SelectItem value="on-beam-home">On BEAM Home</SelectItem>
              <SelectItem value="not-on-beam-home">Not on BEAM Home</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </AdminPanel>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Discovery And Linking</AdminPanelTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {vercelError ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
              {vercelError}
            </div>
          ) : null}
          {beamError ? (
            <div className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-800 dark:text-cyan-100">
              BEAM Home directory check unavailable: {beamError}
            </div>
          ) : null}
          {beamLoading ? (
            <p className="text-sm text-muted-foreground">Checking BEAM Home site directory…</p>
          ) : null}

          {vercelLoading ? (
            <p className="text-sm text-muted-foreground">Loading Vercel projects…</p>
          ) : unlinkedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unlinked Vercel projects match the current filters.</p>
          ) : (
            <div className="space-y-3">
              {unlinkedProjects.map((project) => {
                const beamMatches = beamMatchesByProjectId.get(project.id) ?? []

                return (
                  <AdminPanelInset key={project.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{project.name}</p>
                          <Badge variant="outline">{project.deploymentState || "unknown"}</Badge>
                          <Badge variant="secondary">
                            {ADMIN_AREAS.find((area) => area.id === getVercelProjectPrimaryArea(project))?.label || "Web Development"}
                          </Badge>
                          {beamMatches.length > 0 ? <Badge className="bg-cyan-700 text-white">On BEAM Home</Badge> : null}
                        </div>
                        {project.repoSlug ? (
                          <p className="text-sm text-muted-foreground">Repo: {project.repoSlug}</p>
                        ) : null}
                        {project.productionUrl ? (
                          <a
                            href={project.productionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-orange-600 transition-colors hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {project.productionUrl}
                          </a>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          Domains: {project.domains.length > 0 ? project.domains.join(", ") : "none yet"}
                        </p>
                        {beamMatches.length > 0 ? (
                          <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm">
                            <p className="font-medium text-cyan-900 dark:text-cyan-100">
                              Existing BEAM Home site{beamMatches.length > 1 ? "s" : ""} detected
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {beamMatches.map((entry) => (
                                <a
                                  key={entry.id}
                                  href={entry.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 px-2.5 py-1 text-xs text-cyan-900 transition-colors hover:bg-cyan-500/10 dark:text-cyan-100"
                                >
                                  {entry.title}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2 lg:w-[320px]">
                        <Select
                          value={projectClientLinks[project.id] || ""}
                          onValueChange={(value) => setProjectClientLinks((prev) => ({ ...prev, [project.id]: value }))}
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
                            onClick={() => handleAttachVercelProject(project.id, "link")}
                            disabled={vercelActionProjectId === project.id}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            Link
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => handleAttachVercelProject(project.id, "create")}
                            disabled={vercelActionProjectId === project.id}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {beamMatches.length > 0 ? "Review Client" : "Add Client"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AdminPanelInset>
                )
              })}
            </div>
          )}
        </CardContent>
      </AdminPanel>

      <AdminPanel>
        <CardHeader>
          <AdminPanelTitle>Client Sync Controls</AdminPanelTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading clients…</p>
          ) : websiteClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No website-oriented client records are configured yet.</p>
          ) : (
            <div className="space-y-3">
              {websiteClients.map((client) => (
                <AdminPanelInset
                  key={client.id}
                  className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.vercelProjectName || client.websiteUrl || client.deployUrl || "No website mapped yet"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/clients/${client.id}`}>View Client</Link>
                    </Button>
                    <Button onClick={() => handleSyncClientFromVercel(client.id)} disabled={syncingClientId === client.id}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${syncingClientId === client.id ? "animate-spin" : ""}`} />
                      Sync
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
          <AdminPanelTitle>Detected Projects</AdminPanelTitle>
        </CardHeader>
        <CardContent>
          {vercelLoading ? (
            <p className="text-sm text-muted-foreground">Loading detected projects…</p>
          ) : filteredProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Vercel projects found.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => {
                const beamMatches = beamMatchesByProjectId.get(project.id) ?? []

                return (
                  <AdminPanelInset key={project.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{project.name}</p>
                      <Badge variant="outline">{project.linkedClientName ? "linked" : "unmapped"}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {ADMIN_AREAS.find((area) => area.id === getVercelProjectPrimaryArea(project))?.label || "Web Development"}
                      </Badge>
                      <Badge variant="outline">{project.deploymentState || "unknown"}</Badge>
                      {beamMatches.length > 0 ? <Badge className="bg-cyan-700 text-white">On BEAM Home</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{project.linkedClientName || "No client linked yet"}</p>
                    {beamMatches.length > 0 ? (
                      <a
                        href={beamMatches[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-700 transition-colors hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
                      >
                        {beamMatches[0].title}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {project.repoSlug || project.productionUrl || project.domains.join(", ") || "No deployment details"}
                    </p>
                  </AdminPanelInset>
                )
              })}
            </div>
          )}
        </CardContent>
      </AdminPanel>
    </div>
  )
}
