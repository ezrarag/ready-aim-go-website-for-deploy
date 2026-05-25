"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Box, Building2, Edit, ExternalLink, FileText, PlusCircle, Search, Sparkles, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset } from "@/components/admin/admin-panel"
import { ClientSectionNav } from "@/components/admin/client-section-nav"
import type { ClientDirectoryEntry, ClientStatus, DeployStatus, StripeStatus } from "@/lib/client-directory"
import { clientHasWebsiteSignal } from "@/lib/admin-operations"
import {
  applyClientEditPayload,
  buildClientEditPayload,
  canSaveClientEditForm,
  createClientEditForm,
  EMPTY_CLIENT_EDIT_FORM,
  getClientEditPayloadSignature,
  type ClientEditPayload,
} from "@/lib/client-edit-form"
import { serializeFirestoreValue } from "@/lib/firestore-json"
import { getClientPreferredProductionUrl } from "@/lib/vercel"

type Client = ClientDirectoryEntry
type EditSaveState = "idle" | "saving" | "saved" | "error"
type RosterView = "relationships" | "internal" | "all"

async function saveClientEdit(clientId: string, payload: ClientEditPayload) {
  const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error || "Failed to update client")
  }
}

function formatClientActivity(value: unknown) {
  const serialized = serializeFirestoreValue(value)
  if (serialized instanceof Date) return serialized.toLocaleString()
  if (typeof serialized === "string" && serialized.trim()) return serialized
  if (typeof serialized === "number") return String(serialized)
  return "Recently updated"
}

function getClientEmails(client: Client): string[] {
  return [client.contactEmail, client.clientPortalEmail]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase())
}

function isInternalTeamRecord(client: Client): boolean {
  const emails = getClientEmails(client)
  if (emails.some((email) => email.endsWith("@readyaimgo.biz"))) return true

  const identityText = [client.name, client.storyId, ...(client.brands ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return identityText.includes("readyaimgo") || identityText.includes("ready aim go")
}

function getActivityTimestamp(client: Client): number {
  const candidates = [client.lastActivity, client.updatedAt]
  for (const value of candidates) {
    const serialized = serializeFirestoreValue(value)
    if (!serialized) continue
    if (serialized instanceof Date) {
      const timestamp = serialized.getTime()
      if (!Number.isNaN(timestamp)) return timestamp
    }
    if (typeof serialized === "string" || typeof serialized === "number") {
      const timestamp = new Date(serialized).getTime()
      if (!Number.isNaN(timestamp)) return timestamp
    }
  }
  return 0
}

function formatLastInteraction(client: Client): string {
  const timestamp = getActivityTimestamp(client)
  if (!timestamp) return formatClientActivity(client.lastActivity)
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp))
}

function getDaysSinceInteraction(client: Client): number | null {
  const timestamp = getActivityTimestamp(client)
  if (!timestamp) return null
  return Math.floor((Date.now() - timestamp) / 86_400_000)
}

function getRelationshipHealth(client: Client): { label: string; tone: "good" | "watch" | "setup" } {
  if (client.status === "onboarding") return { label: "Setup", tone: "setup" }
  if (!client.storyVideoUrl || !clientHasWebsiteSignal(client)) return { label: "Needs Proof", tone: "watch" }
  const daysSinceInteraction = getDaysSinceInteraction(client)
  if (daysSinceInteraction === null || daysSinceInteraction > 21) return { label: "Follow Up", tone: "watch" }
  return { label: "Healthy", tone: "good" }
}

function getRelationshipHealthClass(tone: "good" | "watch" | "setup") {
  if (tone === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (tone === "setup") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [missingFieldFilter, setMissingFieldFilter] = useState<"all" | "storyVideo" | "websiteUrl">("all")
  const [rosterView, setRosterView] = useState<RosterView>("relationships")
  const [loading, setLoading] = useState(true)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editSaveState, setEditSaveState] = useState<EditSaveState>("idle")
  const [generatingPulse, setGeneratingPulse] = useState(false)
  const editAutosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editLastSavedSignatureRef = useRef("")
  const editLastErrorSignatureRef = useRef("")
  const [addForm, setAddForm] = useState({
    name: "",
    storyId: "",
    storyVideoUrl: "",
    githubRepo: "",
    showOnFrontend: true,
  })
  const [editForm, setEditForm] = useState(() => createClientEditForm())

  useEffect(() => {
    void fetchClientsData()
  }, [])

  useEffect(() => {
    filterClients()
  }, [clients, searchTerm, missingFieldFilter, rosterView])

  const fetchClientsData = async () => {
    try {
      setLoading(true)
      const clientsResponse = await fetch("/api/clients", { cache: "no-store" })
      if (!clientsResponse.ok) return
      const payload = await clientsResponse.json()
      if (payload?.success && Array.isArray(payload.clients)) {
        setClients(payload.clients as Client[])
      }
    } catch (error) {
      console.error("Error fetching clients data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterClients = () => {
    let filtered = [...clients]

    if (rosterView === "relationships") {
      filtered = filtered.filter((client) => !isInternalTeamRecord(client))
    }

    if (rosterView === "internal") {
      filtered = filtered.filter((client) => isInternalTeamRecord(client))
    }

    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase()
      filtered = filtered.filter((client) =>
        [client.name, client.storyId, client.contactEmail, client.clientPortalEmail, client.workspaceId, ...(client.brands ?? [])]
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .some((value) => value.toLowerCase().includes(normalizedSearch))
      )
    }

    if (missingFieldFilter === "storyVideo") {
      filtered = filtered.filter((client) => !client.storyVideoUrl?.trim())
    }

    if (missingFieldFilter === "websiteUrl") {
      filtered = filtered.filter((client) => !client.websiteUrl?.trim() && !client.deployUrl?.trim())
    }

    const toTs = (value?: unknown): number => {
      const serialized = serializeFirestoreValue(value)
      if (!serialized) return 0
      if (serialized instanceof Date) return Number.isNaN(serialized.getTime()) ? 0 : serialized.getTime()
      if (typeof serialized !== "string" && typeof serialized !== "number") return 0
      const timestamp = new Date(serialized).getTime()
      return Number.isNaN(timestamp) ? 0 : timestamp
    }

    filtered.sort((a, b) => {
      const aTs = toTs(a.updatedAt) || toTs(a.lastActivity)
      const bTs = toTs(b.updatedAt) || toTs(b.lastActivity)
      return bTs - aTs
    })

    setFilteredClients(filtered)
  }

  const handleAddClient = async () => {
    const name = addForm.name.trim()
    const storyId = addForm.storyId.trim()
    const storyVideoUrl = addForm.storyVideoUrl.trim()
    if (!name || !storyId || !storyVideoUrl) return

    setAddSubmitting(true)
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          storyId,
          storyVideoUrl,
          githubRepo: addForm.githubRepo.trim() || undefined,
          githubRepos: addForm.githubRepo.trim() ? [addForm.githubRepo.trim()] : undefined,
          showOnFrontend: addForm.showOnFrontend,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Failed to create client")

      setAddClientOpen(false)
      setAddForm({ name: "", storyId: "", storyVideoUrl: "", githubRepo: "", showOnFrontend: true })
      await fetchClientsData()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to create client")
    } finally {
      setAddSubmitting(false)
    }
  }

  const handleEditClient = (client: Client) => {
    const nextForm = createClientEditForm(client)
    if (editAutosaveTimeoutRef.current) {
      clearTimeout(editAutosaveTimeoutRef.current)
      editAutosaveTimeoutRef.current = null
    }
    setEditingClient(client)
    setEditForm(nextForm)
    setEditSaveState("saved")
    editLastSavedSignatureRef.current = getClientEditPayloadSignature(buildClientEditPayload(nextForm))
    editLastErrorSignatureRef.current = ""
    setEditClientOpen(true)
  }

  const applySavedEdit = (clientId: string, payload: ClientEditPayload) => {
    const signature = getClientEditPayloadSignature(payload)
    editLastSavedSignatureRef.current = signature
    editLastErrorSignatureRef.current = ""
    setEditSaveState("saved")
    setClients((prev) =>
      prev.map((client) => (client.id === clientId ? applyClientEditPayload(client, payload) : client))
    )
    setEditingClient((prev) =>
      prev && prev.id === clientId ? applyClientEditPayload(prev, payload) : prev
    )
  }

  const handleSaveEdit = async () => {
    if (!editingClient || !canSaveClientEditForm(editForm)) return
    const payload = buildClientEditPayload(editForm)

    if (editAutosaveTimeoutRef.current) {
      clearTimeout(editAutosaveTimeoutRef.current)
      editAutosaveTimeoutRef.current = null
    }
    setEditSubmitting(true)
    setEditSaveState("saving")
    try {
      await saveClientEdit(editingClient.id, payload)
      applySavedEdit(editingClient.id, payload)
    } catch (error) {
      console.error(error)
      editLastErrorSignatureRef.current = getClientEditPayloadSignature(payload)
      setEditSaveState("error")
      alert(error instanceof Error ? error.message : "Failed to update client")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleEditDialogOpenChange = async (open: boolean) => {
    if (open) {
      setEditClientOpen(true)
      return
    }

    if (editAutosaveTimeoutRef.current) {
      clearTimeout(editAutosaveTimeoutRef.current)
      editAutosaveTimeoutRef.current = null
    }

    if (editSubmitting) {
      return
    }

    if (!editingClient) {
      setEditClientOpen(false)
      setEditingClient(null)
      setEditForm(EMPTY_CLIENT_EDIT_FORM)
      return
    }

    const payload = buildClientEditPayload(editForm)
    const signature = getClientEditPayloadSignature(payload)

    if (
      canSaveClientEditForm(editForm) &&
      signature !== editLastSavedSignatureRef.current
    ) {
      setEditSubmitting(true)
      setEditSaveState("saving")
      try {
        await saveClientEdit(editingClient.id, payload)
        applySavedEdit(editingClient.id, payload)
      } catch (error) {
        console.error(error)
        editLastErrorSignatureRef.current = signature
        setEditSaveState("error")
        alert(error instanceof Error ? error.message : "Failed to update client")
        return
      } finally {
        setEditSubmitting(false)
      }
    }

    setEditClientOpen(false)
    setEditingClient(null)
    setEditForm(EMPTY_CLIENT_EDIT_FORM)
  }

  useEffect(() => {
    if (!editClientOpen || !editingClient) return

    const payload = buildClientEditPayload(editForm)
    const signature = getClientEditPayloadSignature(payload)

    if (
      !canSaveClientEditForm(editForm) ||
      signature === editLastSavedSignatureRef.current ||
      signature === editLastErrorSignatureRef.current
    ) {
      return
    }

    if (editSubmitting) return

    setEditSaveState("idle")
    if (editAutosaveTimeoutRef.current) {
      clearTimeout(editAutosaveTimeoutRef.current)
    }

    editAutosaveTimeoutRef.current = setTimeout(async () => {
      setEditSubmitting(true)
      setEditSaveState("saving")
      try {
        await saveClientEdit(editingClient.id, payload)
        applySavedEdit(editingClient.id, payload)
      } catch (error) {
        console.error(error)
        editLastErrorSignatureRef.current = signature
        setEditSaveState("error")
      } finally {
        setEditSubmitting(false)
      }
    }, 800)

    return () => {
      if (editAutosaveTimeoutRef.current) {
        clearTimeout(editAutosaveTimeoutRef.current)
        editAutosaveTimeoutRef.current = null
      }
    }
  }, [editClientOpen, editForm, editingClient, editSubmitting])

  const handleGeneratePulseSummary = async () => {
    if (!editingClient) return

    setGeneratingPulse(true)
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(editingClient.id)}/pulse-suggestions`, {
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok || !data?.success) throw new Error(data?.error || "Failed to generate pulse summary")

      const suggestions: string[] = Array.isArray(data.suggestions) ? data.suggestions : []
      const combined = [data.summary, ...suggestions.map((item) => `- ${item}`)].filter(Boolean).join("\n")
      setEditForm((prev) => ({ ...prev, pulseSummary: combined }))
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to generate pulse summary")
    } finally {
      setGeneratingPulse(false)
    }
  }

  const relationshipClients = clients.filter((client) => !isInternalTeamRecord(client))
  const internalTeamRecords = clients.filter((client) => isInternalTeamRecord(client))
  const activeClients = relationshipClients.filter((client) => client.status === "active").length
  const onboardingClients = relationshipClients.filter((client) => client.status === "onboarding").length
  const storyCoverage = relationshipClients.filter((client) => Boolean(client.storyVideoUrl?.trim())).length
  const websiteCoverage = relationshipClients.filter((client) => clientHasWebsiteSignal(client)).length
  const followUpClients = relationshipClients.filter((client) => getRelationshipHealth(client).label === "Follow Up").length
  const editCanSave = canSaveClientEditForm(editForm)
  const editHasUnsavedChanges =
    Boolean(editingClient) &&
    getClientEditPayloadSignature(buildClientEditPayload(editForm)) !== editLastSavedSignatureRef.current
  const editStatusMessage = !editCanSave
    ? "Name and Story ID are required before changes can save."
    : editSaveState === "error"
      ? "Autosave failed. Use Save now to retry."
      : editSubmitting
        ? "Saving changes…"
        : editHasUnsavedChanges
          ? "Changes auto-save after a short pause."
          : "All changes saved."

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-64 rounded bg-muted" />
            <div className="h-4 w-96 rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Card key={item}>
                <CardHeader>
                  <div className="animate-pulse">
                    <div className="mb-2 h-6 w-32 rounded bg-muted" />
                    <div className="h-4 w-24 rounded bg-muted" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
            <h1 className="text-2xl font-bold text-foreground">Client Relationships</h1>
            <p className="text-muted-foreground">
              Relationship health, portal access context, public proof, and follow-up signals.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="border-border/70 bg-card/80">
              <Link href="/dashboard/clients/vercel-sync">
                Vercel Sync
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button onClick={() => setAddClientOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>

        <ClientSectionNav />

        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetricTile
            label="Relationships"
            value={relationshipClients.length}
            hint={`${activeClients} active`}
          />
          <AdminMetricTile
            label="Onboarding"
            value={onboardingClients}
            hint="Still moving into delivery"
          />
          <AdminMetricTile
            label="Follow-Up"
            value={followUpClients}
            hint="No recent touch in 21+ days"
          />
          <AdminMetricTile
            label="Internal Hidden"
            value={internalTeamRecords.length}
            hint="@readyaimgo / team-like records"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AdminMetricTile
            className={`cursor-pointer transition-shadow ${missingFieldFilter === "storyVideo" ? "ring-2 ring-orange-500" : ""}`}
            onClick={() => setMissingFieldFilter((prev) => (prev === "storyVideo" ? "all" : "storyVideo"))}
            label="Story / Activity Coverage"
            value={storyCoverage}
            hint={`Missing: ${relationshipClients.length - storyCoverage}`}
          />
          <AdminMetricTile
            className={`cursor-pointer transition-shadow ${missingFieldFilter === "websiteUrl" ? "ring-2 ring-orange-500" : ""}`}
            onClick={() => setMissingFieldFilter((prev) => (prev === "websiteUrl" ? "all" : "websiteUrl"))}
            label="Website Coverage"
            value={websiteCoverage}
            hint={`Missing: ${relationshipClients.length - websiteCoverage}`}
          />
        </div>

        <AdminPanel>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search clients, brands, emails, or story IDs..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={rosterView === "relationships" ? "default" : "outline"}
                  onClick={() => setRosterView("relationships")}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Relationships
                </Button>
                <Button
                  variant={rosterView === "internal" ? "default" : "outline"}
                  onClick={() => setRosterView("internal")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Internal
                </Button>
                <Button
                  variant={rosterView === "all" ? "default" : "outline"}
                  onClick={() => setRosterView("all")}
                >
                  All Records
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={missingFieldFilter === "all" ? "default" : "outline"} onClick={() => setMissingFieldFilter("all")}>
                  All
                </Button>
                <Button
                  variant={missingFieldFilter === "storyVideo" ? "default" : "outline"}
                  onClick={() => setMissingFieldFilter("storyVideo")}
                >
                  Missing Story
                </Button>
                <Button
                  variant={missingFieldFilter === "websiteUrl" ? "default" : "outline"}
                  onClick={() => setMissingFieldFilter("websiteUrl")}
                >
                  Missing Website
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Internal ReadyAimGo records are hidden from the relationship view by default. Technical discovery stays in <Link href="/dashboard/clients/vercel-sync" className="text-orange-600 underline-offset-4 hover:underline dark:text-orange-400">Vercel Sync</Link> and card-level Assets & Infra drawers.
            </p>
          </CardContent>
        </AdminPanel>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client) => {
            const preferredProductionUrl = getClientPreferredProductionUrl(client)
            const relationshipHealth = getRelationshipHealth(client)
            const daysSinceInteraction = getDaysSinceInteraction(client)
            const primaryEmail = client.clientPortalEmail || client.contactEmail

            return (
              <AdminPanel key={client.id} className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg text-foreground">{client.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{client.storyId}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {client.brands.map((brand) => (
                          <Badge key={brand} variant="outline" className="text-xs">
                            {brand}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getRelationshipHealthClass(relationshipHealth.tone)}>
                        {relationshipHealth.label}
                      </Badge>
                      <Badge variant="outline">{isInternalTeamRecord(client) ? "Internal" : client.status}</Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Public Proof</p>
                      <p className="mt-2 text-foreground">{client.storyVideoUrl && preferredProductionUrl ? "Ready" : "Needs work"}</p>
                    </AdminPanelInset>
                    <AdminPanelInset className="p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Last Touch</p>
                      <p className="mt-2 text-foreground">
                        {daysSinceInteraction === null ? "Unknown" : `${daysSinceInteraction}d ago`}
                      </p>
                    </AdminPanelInset>
                  </div>

                  {primaryEmail ? (
                    <div className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Portal contact:</strong>{" "}
                      <span className="font-mono text-xs">{primaryEmail}</span>
                    </div>
                  ) : null}

                  {client.pulseSummary ? (
                    <AdminPanelInset className="p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        Pulse Summary
                      </div>
                      <p className="line-clamp-4 whitespace-pre-line text-sm text-foreground/80">{client.pulseSummary}</p>
                    </AdminPanelInset>
                  ) : null}

                  <div className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Last interaction:</strong> {formatLastInteraction(client)}
                  </div>

                  <details className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground">
                      <Box className="h-4 w-4 text-muted-foreground" />
                      Assets & Infra
                    </summary>
                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <div>
                        <strong className="text-foreground">Production:</strong> {preferredProductionUrl || "Missing"}
                      </div>
                      <div>
                        <strong className="text-foreground">Workspace:</strong> {client.workspaceId || client.id}
                      </div>
                      <div>
                        <strong className="text-foreground">Repo:</strong> {client.githubRepo || client.githubRepos?.[0] || "Not linked"}
                      </div>
                      <div>
                        <strong className="text-foreground">Deploy:</strong> {client.deployStatus}
                      </div>
                    </div>
                  </details>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/dashboard/clients/${encodeURIComponent(client.id)}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClient(client)}
                      aria-label={`Edit ${client.name}`}
                      title={`Edit ${client.name}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {preferredProductionUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={preferredProductionUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </AdminPanel>
            )
          })}
        </div>

        {filteredClients.length === 0 ? (
          <AdminPanel>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No records match this view and filter combination.
            </CardContent>
          </AdminPanel>
        ) : null}
      </div>

      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="add-name">Name *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Client name"
              />
            </div>
            <div>
              <Label htmlFor="add-storyId">Story ID *</Label>
              <Input
                id="add-storyId"
                value={addForm.storyId}
                onChange={(event) => setAddForm((prev) => ({ ...prev, storyId: event.target.value }))}
                placeholder="e.g. femileasing"
              />
              <p className="mt-1 text-xs text-muted-foreground">Used in roster and story routes.</p>
            </div>
            <div>
              <Label htmlFor="add-storyVideoUrl">Story Video URL *</Label>
              <Input
                id="add-storyVideoUrl"
                type="url"
                value={addForm.storyVideoUrl}
                onChange={(event) => setAddForm((prev) => ({ ...prev, storyVideoUrl: event.target.value }))}
                placeholder="https://..."
              />
            </div>
            <details className="rounded-lg border border-border bg-muted/20 p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Optional Assets & Infra</summary>
              <div className="mt-3">
                <Label htmlFor="add-githubRepo">GitHub Repo</Label>
                <Input
                  id="add-githubRepo"
                  value={addForm.githubRepo}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, githubRepo: event.target.value }))}
                  placeholder="owner/repo"
                />
              </div>
            </details>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="add-showOnFrontend"
                checked={addForm.showOnFrontend}
                onChange={(event) => setAddForm((prev) => ({ ...prev, showOnFrontend: event.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="add-showOnFrontend" className="cursor-pointer">
                Show on frontend roster
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddClientOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddClient}
              disabled={!addForm.name.trim() || !addForm.storyId.trim() || !addForm.storyVideoUrl.trim() || addSubmitting}
            >
              {addSubmitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editClientOpen} onOpenChange={(open) => void handleEditDialogOpenChange(open)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Keep relationship fields visible first. Technical links live in Assets & Infra.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Relationship Identity</h3>
              <p className="text-xs text-muted-foreground">Name, story routing, business labels, and account status.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label htmlFor="edit-storyId">Story ID *</Label>
                <Input
                  id="edit-storyId"
                  value={editForm.storyId}
                  onChange={(event) => setEditForm({ ...editForm, storyId: event.target.value })}
                  placeholder="e.g. femileasing"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-brands">Brands (comma-separated)</Label>
              <Input
                id="edit-brands"
                value={editForm.brands.join(", ")}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    brands: event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                  })
                }
                placeholder="Brand 1, Brand 2"
              />
            </div>

            <div className="max-w-xs">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(value: ClientStatus) => setEditForm({ ...editForm, status: value })}>
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
            </div>

            <details className="rounded-lg border border-border bg-muted/20 p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-foreground">
                <Box className="h-4 w-4 text-muted-foreground" />
                Assets & Infra
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                GitHub, Vercel, App Store, and vertical asset URLs are tucked away so daily relationship edits stay focused.
              </p>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Deploy Status</Label>
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
                    <Label>Stripe Status</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-websiteUrl">Website URL</Label>
                <Input
                  id="edit-websiteUrl"
                  type="url"
                  value={editForm.websiteUrl}
                  onChange={(event) => setEditForm({ ...editForm, websiteUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-deployUrl">Deploy URL</Label>
                <Input
                  id="edit-deployUrl"
                  type="url"
                  value={editForm.deployUrl}
                  onChange={(event) => setEditForm({ ...editForm, deployUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-githubRepo">GitHub Repo</Label>
              <Input
                id="edit-githubRepo"
                value={editForm.githubRepo}
                onChange={(event) => setEditForm({ ...editForm, githubRepo: event.target.value })}
                placeholder="owner/repo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-githubReposCsv">GitHub Repos (CSV)</Label>
                <Input
                  id="edit-githubReposCsv"
                  value={editForm.githubReposCsv}
                  onChange={(event) => setEditForm({ ...editForm, githubReposCsv: event.target.value })}
                  placeholder="owner/repo-one, owner/repo-two"
                />
              </div>
              <div>
                <Label htmlFor="edit-deployHostsCsv">Deploy Hosts (CSV)</Label>
                <Input
                  id="edit-deployHostsCsv"
                  value={editForm.deployHostsCsv}
                  onChange={(event) => setEditForm({ ...editForm, deployHostsCsv: event.target.value })}
                  placeholder="app.example.com, preview.example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-appUrl">App URL</Label>
                <Input
                  id="edit-appUrl"
                  type="url"
                  value={editForm.appUrl}
                  onChange={(event) => setEditForm({ ...editForm, appUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-appStoreUrl">App Store URL</Label>
                <Input
                  id="edit-appStoreUrl"
                  type="url"
                  value={editForm.appStoreUrl}
                  onChange={(event) => setEditForm({ ...editForm, appStoreUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-rdUrl">R/D URL</Label>
                <Input
                  id="edit-rdUrl"
                  type="url"
                  value={editForm.rdUrl}
                  onChange={(event) => setEditForm({ ...editForm, rdUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-housingUrl">Housing URL</Label>
                <Input
                  id="edit-housingUrl"
                  type="url"
                  value={editForm.housingUrl}
                  onChange={(event) => setEditForm({ ...editForm, housingUrl: event.target.value })}
                  placeholder="https://..."
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
                  onChange={(event) => setEditForm({ ...editForm, transportationUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-insuranceUrl">Insurance URL</Label>
                <Input
                  id="edit-insuranceUrl"
                  type="url"
                  value={editForm.insuranceUrl}
                  onChange={(event) => setEditForm({ ...editForm, insuranceUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

              </div>
            </details>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Public Proof</h3>
              <p className="text-xs text-muted-foreground">Story visibility and public-facing proof signals.</p>
            </div>

            <div>
              <Label htmlFor="edit-storyVideoUrl">Story Video URL *</Label>
              <Input
                id="edit-storyVideoUrl"
                type="url"
                value={editForm.storyVideoUrl}
                onChange={(event) => setEditForm({ ...editForm, storyVideoUrl: event.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Activity & Relationship Pulse</h3>
              <p className="text-xs text-muted-foreground">
                These fields support the roster health badges and follow-up prioritization.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="edit-revenue">Revenue</Label>
                <Input
                  id="edit-revenue"
                  type="number"
                  value={editForm.revenue}
                  onChange={(event) => setEditForm({ ...editForm, revenue: parseFloat(event.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="edit-meetings">Meetings</Label>
                <Input
                  id="edit-meetings"
                  type="number"
                  value={editForm.meetings}
                  onChange={(event) => setEditForm({ ...editForm, meetings: parseInt(event.target.value, 10) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="edit-emails">Emails</Label>
                <Input
                  id="edit-emails"
                  type="number"
                  value={editForm.emails}
                  onChange={(event) => setEditForm({ ...editForm, emails: parseInt(event.target.value, 10) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="edit-commits">Commits</Label>
                <Input
                  id="edit-commits"
                  type="number"
                  value={editForm.commits}
                  onChange={(event) => setEditForm({ ...editForm, commits: parseInt(event.target.value, 10) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-lastActivity">Last Activity</Label>
              <Input
                id="edit-lastActivity"
                type="datetime-local"
                value={(() => {
                  if (!editForm.lastActivity) return ""
                  const date = new Date(editForm.lastActivity)
                  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16)
                })()}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    lastActivity: event.target.value ? new Date(event.target.value).toISOString() : "",
                  })
                }
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="edit-pulseSummary">Pulse Summary</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePulseSummary}
                  disabled={generatingPulse || !editingClient}
                >
                  {generatingPulse ? "Generating…" : "Generate Pulse Summary"}
                </Button>
              </div>
              <Textarea
                id="edit-pulseSummary"
                value={editForm.pulseSummary}
                onChange={(event) => setEditForm({ ...editForm, pulseSummary: event.target.value })}
                placeholder="Summary of recent activity..."
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-showOnFrontend"
                checked={editForm.showOnFrontend}
                onChange={(event) => setEditForm({ ...editForm, showOnFrontend: event.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-showOnFrontend" className="cursor-pointer">
                Show on frontend roster
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isNewStory"
                checked={editForm.isNewStory}
                onChange={(event) => setEditForm({ ...editForm, isNewStory: event.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-isNewStory" className="cursor-pointer">
                Is new story
              </Label>
            </div>
          </div>
          <DialogFooter className="sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{editStatusMessage}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => void handleEditDialogOpenChange(false)}
                disabled={editSubmitting}
              >
                Close
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editCanSave || editSubmitting}
              >
                {editSubmitting ? "Saving…" : "Save now"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
