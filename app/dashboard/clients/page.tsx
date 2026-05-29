"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { ClientSectionNav } from "@/components/admin/client-section-nav"
import { useToast } from "@/hooks/use-toast"
import {
  buildAdminActivity,
  computeAdminOpsMetrics,
  formatAdminDate,
  formatAdminDateTime,
  getClientPrimaryEmail,
  getRelationshipHealth,
  isPortalPersonRecord,
  isRelationshipRecord,
  normalizeAdminClientRecord,
  normalizeAdminProjectRecord,
  normalizeAdminTaskRecord,
  sortByUpdatedDesc,
  type AdminActivityRecord,
  type AdminClientRecord,
  type AdminProjectRecord,
  type AdminTaskRecord,
} from "@/lib/admin/ops-data"

type RosterView = "relationships" | "people" | "needs-assignment" | "activity"

type ClientsState = {
  clients: AdminClientRecord[]
  projects: AdminProjectRecord[]
  tasks: AdminTaskRecord[]
  errors: string[]
}

type CreateClientForm = {
  email: string
  name: string
  storyId: string
  notes: string
}

type CreateClientResult = {
  clientId: string
  workspaceId: string
  email: string
  message: string
}

const emptyState: ClientsState = {
  clients: [],
  projects: [],
  tasks: [],
  errors: [],
}

async function readAdminArray(url: string, label: string): Promise<{ records: unknown[]; error?: string }> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload?.success === false) {
      return { records: [], error: payload?.error || `${label} returned ${response.status}` }
    }
    const records = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.clients) ? payload.clients : []
    return { records }
  } catch (error) {
    return { records: [], error: error instanceof Error ? error.message : `Unable to load ${label}` }
  }
}

function resolveInitialView(value: string | null): RosterView {
  if (value === "people" || value === "needs-assignment" || value === "activity") return value
  return "relationships"
}

function healthClass(tone: "good" | "warning" | "setup") {
  if (tone === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (tone === "setup") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function activityClass(tone: AdminActivityRecord["tone"]) {
  if (tone === "danger") return "border-red-500/30 bg-red-500/10"
  if (tone === "warning") return "border-amber-500/30 bg-amber-500/10"
  if (tone === "success") return "border-emerald-500/30 bg-emerald-500/10"
  return "border-border/70 bg-card/70"
}

function clientMatchesSearch(client: AdminClientRecord, search: string) {
  if (!search) return true
  const text = [
    client.name,
    client.storyId,
    client.contactEmail,
    client.clientPortalEmail,
    client.workspaceId,
    client.assignedClientId,
    client.portalUid,
    ...client.brands,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return text.includes(search.toLowerCase())
}

function getPortalPersonEmail(person: AdminClientRecord): string {
  return person.clientPortalEmail || person.contactEmail || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.storyId) ? person.storyId : "")
}

function humanizeEmailName(email: string): string {
  const localPart = email.split("@")[0] || email
  const words = localPart
    .replace(/[._+-]+/g, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean)
  return words.length
    ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")
    : email
}

function slugifyClientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildCreateClientForm(person: AdminClientRecord): CreateClientForm {
  const email = getPortalPersonEmail(person)
  const fallbackName = humanizeEmailName(email || person.name)
  const name = person.name && person.name !== person.storyId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.name)
    ? person.name
    : fallbackName
  return {
    email,
    name,
    storyId: slugifyClientName(name) || slugifyClientName(fallbackName),
    notes: "",
  }
}

function RelationshipCard({ client, projects }: { client: AdminClientRecord; projects: AdminProjectRecord[] }) {
  const health = getRelationshipHealth(client, projects)
  const clientProjects = projects.filter((project) => project.clientId === client.id)
  return (
    <AdminPanel>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <AdminPanelTitle className="truncate text-lg">{client.name}</AdminPanelTitle>
            <p className="mt-1 truncate text-sm text-muted-foreground">{client.storyId}</p>
          </div>
          <Badge className={healthClass(health.tone)}>{health.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{client.status}</Badge>
          {client.showOnFrontend ? <Badge variant="secondary">Public</Badge> : <Badge variant="outline">Hidden</Badge>}
          {clientProjects.length > 0 ? <Badge variant="outline">{clientProjects.length} project{clientProjects.length === 1 ? "" : "s"}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {getClientPrimaryEmail(client) ? (
          <p className="font-mono text-xs text-muted-foreground">{getClientPrimaryEmail(client)}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No portal contact recorded.</p>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <AdminPanelInset className="p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Proof</p>
            <p className="mt-2 text-foreground">{client.storyVideoUrl || client.websiteUrl || client.deployUrl ? "Present" : "Missing"}</p>
          </AdminPanelInset>
          <AdminPanelInset className="p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
            <p className="mt-2 text-foreground">{formatAdminDate(client.updatedAt)}</p>
          </AdminPanelInset>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/dashboard/clients/${encodeURIComponent(client.id)}`}>
              Open Workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/web-development?clientId=${encodeURIComponent(client.id)}`}>Projects</Link>
          </Button>
        </div>
      </CardContent>
    </AdminPanel>
  )
}

function PortalPersonCard({
  person,
  onCreateClient,
}: {
  person: AdminClientRecord
  onCreateClient: (person: AdminClientRecord) => void
}) {
  const assigned = Boolean(person.assignedClientId)
  return (
    <AdminPanel>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <AdminPanelTitle className="truncate text-lg">{person.name}</AdminPanelTitle>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{person.clientPortalEmail || person.contactEmail || person.storyId}</p>
          </div>
          <Badge className={assigned ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
            {assigned ? "Assigned" : "Needs Assignment"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <AdminPanelInset className="p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assigned Client</p>
            <p className="mt-2 truncate text-foreground">{person.assignedClientId || "Pending"}</p>
          </AdminPanelInset>
          <AdminPanelInset className="p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last Seen</p>
            <p className="mt-2 text-foreground">{formatAdminDate(person.updatedAt)}</p>
          </AdminPanelInset>
        </div>
        <p className="text-sm text-muted-foreground">{person.lastActivity}</p>
        <div className="flex flex-wrap gap-2">
          {!assigned ? (
            <Button size="sm" onClick={() => onCreateClient(person)} disabled={!getPortalPersonEmail(person)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Client
            </Button>
          ) : null}
          <Button asChild size="sm" variant={assigned ? "default" : "outline"}>
            <Link href="/dashboard/clients/access">
              Manage Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {person.assignedClientId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/clients/${encodeURIComponent(person.assignedClientId)}`}>Open Client</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </AdminPanel>
  )
}

export default function ClientsPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [state, setState] = useState<ClientsState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState<RosterView>(() => resolveInitialView(searchParams.get("view")))
  const [search, setSearch] = useState("")
  const [selectedPortalPerson, setSelectedPortalPerson] = useState<AdminClientRecord | null>(null)
  const [createForm, setCreateForm] = useState<CreateClientForm>({ email: "", name: "", storyId: "", notes: "" })
  const [creatingClient, setCreatingClient] = useState(false)
  const [createResult, setCreateResult] = useState<CreateClientResult | null>(null)

  const loadClients = async () => {
    setLoading(true)
    setRefreshing(true)
    const [clientsResult, projectsResult, tasksResult] = await Promise.all([
      readAdminArray("/api/admin/clients?includePeople=true&limit=200", "clients"),
      readAdminArray("/api/admin/projects?limit=200", "projects"),
      readAdminArray("/api/admin/tasks?limit=200", "tasks"),
    ])

    setState({
      clients: clientsResult.records.map(normalizeAdminClientRecord),
      projects: projectsResult.records.map(normalizeAdminProjectRecord),
      tasks: tasksResult.records.map(normalizeAdminTaskRecord),
      errors: [clientsResult.error, projectsResult.error, tasksResult.error].filter((error): error is string => Boolean(error)),
    })
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void loadClients()
  }, [])

  useEffect(() => {
    setView(resolveInitialView(searchParams.get("view")))
  }, [searchParams])

  const relationships = useMemo(() => sortByUpdatedDesc(state.clients.filter(isRelationshipRecord)), [state.clients])
  const portalPeople = useMemo(() => sortByUpdatedDesc(state.clients.filter(isPortalPersonRecord)), [state.clients])
  const needsAssignment = useMemo(
    () => portalPeople.filter((person) => person.adminApprovalPending || !person.assignedClientId),
    [portalPeople]
  )
  const activity = useMemo(
    () => buildAdminActivity({ clients: state.clients, projects: state.projects, tasks: state.tasks }),
    [state]
  )
  const metrics = useMemo(
    () => computeAdminOpsMetrics({ clients: state.clients, projects: state.projects, tasks: state.tasks, warnings: state.errors.length }),
    [state]
  )
  const visibleRelationships = useMemo(
    () => relationships.filter((client) => clientMatchesSearch(client, search)),
    [relationships, search]
  )
  const visiblePortalPeople = useMemo(
    () => portalPeople.filter((client) => clientMatchesSearch(client, search)),
    [portalPeople, search]
  )
  const visibleNeedsAssignment = useMemo(
    () => needsAssignment.filter((client) => clientMatchesSearch(client, search)),
    [needsAssignment, search]
  )
  const canCreateClient = Boolean(createForm.email && createForm.name.trim() && createForm.storyId.trim())

  const openCreateDialog = (person: AdminClientRecord) => {
    setSelectedPortalPerson(person)
    setCreateForm(buildCreateClientForm(person))
    setCreateResult(null)
  }

  const closeCreateDialog = (open: boolean) => {
    if (open) return
    setSelectedPortalPerson(null)
    setCreateResult(null)
    setCreatingClient(false)
  }

  const submitCreateClient = async () => {
    if (!selectedPortalPerson || !canCreateClient) return
    setCreatingClient(true)
    try {
      const response = await fetch("/api/admin/clients/from-portal-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createForm.email,
          name: createForm.name,
          storyId: createForm.storyId,
          notes: createForm.notes,
          portalUid: selectedPortalPerson.portalUid,
          portalPersonId: selectedPortalPerson.id,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || `Create failed with ${response.status}`)
      }
      const result = {
        clientId: String(payload.clientId || ""),
        workspaceId: String(payload.workspaceId || ""),
        email: String(payload.email || createForm.email),
        message: String(payload.message || "Client created."),
      }
      setCreateResult(result)
      toast({ title: "Client created", description: result.message })
      await loadClients()
    } catch (error) {
      toast({
        title: "Unable to create client",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCreatingClient(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Ops Console</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground">
              Relationship records, portal people, assignments, and client activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadClients()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/clients?intent=new">Create Intake</Link>
            </Button>
          </div>
        </div>

        <ClientSectionNav />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile label="Relationships" value={loading ? "..." : metrics.relationships} hint="Business records" trailing={<Building2 className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Portal People" value={loading ? "..." : metrics.portalPeople} hint="Signed-in users" trailing={<Users className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Needs Assignment" value={loading ? "..." : metrics.needsAssignment} hint="Unassigned portal people" trailing={<UserPlus className="h-5 w-5 text-muted-foreground" />} />
          <AdminMetricTile label="Warnings" value={loading ? "..." : metrics.systemWarnings} hint="API load warnings" trailing={<AlertTriangle className="h-5 w-5 text-muted-foreground" />} />
        </div>

        {state.errors.length > 0 ? (
          <AdminPanel>
            <CardContent className="space-y-2 p-4">
              {state.errors.map((error) => (
                <div key={error} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                  {error}
                </div>
              ))}
            </CardContent>
          </AdminPanel>
        ) : null}

        <AdminPanel>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search names, emails, story IDs, workspace IDs..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["relationships", "Relationships"],
                  ["people", "Portal People"],
                  ["needs-assignment", "Needs Assignment"],
                  ["activity", "Activity"],
                ].map(([id, label]) => (
                  <Button
                    key={id}
                    variant={view === id ? "default" : "outline"}
                    onClick={() => setView(id as RosterView)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </AdminPanel>

        {view === "relationships" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleRelationships.length === 0 ? (
              <AdminPanel className="md:col-span-2 xl:col-span-3">
                <CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                  {loading ? "Loading relationships..." : "No relationship records match this view."}
                </CardContent>
              </AdminPanel>
            ) : (
              visibleRelationships.map((client) => <RelationshipCard key={client.id} client={client} projects={state.projects} />)
            )}
          </section>
        ) : null}

        {view === "people" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiblePortalPeople.length === 0 ? (
              <AdminPanel className="md:col-span-2 xl:col-span-3">
                <CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                  {loading ? "Loading portal people..." : "No portal people match this view."}
                </CardContent>
              </AdminPanel>
            ) : (
              visiblePortalPeople.map((person) => (
                <PortalPersonCard key={person.id} person={person} onCreateClient={openCreateDialog} />
              ))
            )}
          </section>
        ) : null}

        {view === "needs-assignment" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleNeedsAssignment.length === 0 ? (
              <AdminPanel className="md:col-span-2 xl:col-span-3">
                <CardContent className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {loading ? "Loading assignment queue..." : "No portal people need assignment."}
                </CardContent>
              </AdminPanel>
            ) : (
              visibleNeedsAssignment.map((person) => (
                <PortalPersonCard key={person.id} person={person} onCreateClient={openCreateDialog} />
              ))
            )}
          </section>
        ) : null}

        {view === "activity" ? (
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Client Activity
              </AdminPanelTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No client activity found.</p>
              ) : (
                activity.map((item) => {
                  const body = (
                    <AdminPanelInset className={`p-4 ${activityClass(item.tone)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
                        </div>
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{formatAdminDateTime(item.at)}</p>
                    </AdminPanelInset>
                  )
                  return item.href ? <Link key={item.id} href={item.href}>{body}</Link> : <div key={item.id}>{body}</div>
                })
              )}
            </CardContent>
          </AdminPanel>
        ) : null}
      </div>
      <Dialog open={Boolean(selectedPortalPerson)} onOpenChange={closeCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client From Portal Person</DialogTitle>
            <DialogDescription>
              Review the relationship defaults before creating the client and assigning this portal person as owner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="portal-client-email">Email</Label>
              <Input id="portal-client-email" value={createForm.email} readOnly className="font-mono text-xs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="portal-client-name">Client name</Label>
              <Input
                id="portal-client-name"
                value={createForm.name}
                onChange={(event) => {
                  const name = event.target.value
                  setCreateForm((current) => ({
                    ...current,
                    name,
                    storyId: current.storyId ? current.storyId : slugifyClientName(name),
                  }))
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="portal-client-story-id">Story ID</Label>
              <Input
                id="portal-client-story-id"
                value={createForm.storyId}
                onChange={(event) => setCreateForm((current) => ({ ...current, storyId: slugifyClientName(event.target.value) }))}
              />
            </div>
            <AdminPanelInset className="p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Portal role</p>
              <p className="mt-2 font-medium text-foreground">Owner</p>
            </AdminPanelInset>
            <div className="grid gap-2">
              <Label htmlFor="portal-client-notes">Notes</Label>
              <Textarea
                id="portal-client-notes"
                value={createForm.notes}
                onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Optional internal context for this conversion."
              />
            </div>
            {createResult ? (
              <AdminPanelInset className="border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">
                {createResult.message}
              </AdminPanelInset>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {createResult ? (
              <Button asChild>
                <Link href={`/dashboard/clients/${encodeURIComponent(createResult.clientId)}`}>
                  Open Client
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button onClick={() => void submitCreateClient()} disabled={!canCreateClient || creatingClient}>
                {creatingClient ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Create Client
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
