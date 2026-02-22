"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import DashboardLayout from "@/components/dashboard-layout"
import {
  ArrowLeft,
  Plus,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  ExternalLink,
  Edit,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ClientDirectoryEntry, ClientStatus, DeployStatus, StripeStatus } from "@/lib/client-directory"
import type { ClientUpdate, ModuleKey, UpdateStatus } from "@/lib/client-directory"

const MODULE_TYPES: { value: ModuleKey; label: string }[] = [
  { value: "web", label: "Website" },
  { value: "app", label: "App" },
  { value: "rd", label: "R&D" },
  { value: "housing", label: "Housing" },
  { value: "transportation", label: "Transportation" },
  { value: "insurance", label: "Insurance" },
]

interface BeamDirectoryEntry {
  id: string
  label: string
  title: string
  subtitle: string
  url: string
  previewImageUrl: string
  sortOrder: number
  isActive: boolean
  createdBy: string
  updatedBy: string
  source: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const [client, setClient] = useState<ClientDirectoryEntry | null>(null)
  const [updates, setUpdates] = useState<ClientUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [videoUploading, setVideoUploading] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: "web" as ModuleKey,
    title: "",
    summary: "",
    details: "",
    status: "draft" as UpdateStatus,
  })
  const [editForm, setEditForm] = useState({
    name: '',
    storyId: '',
    brands: [] as string[],
    status: 'onboarding' as ClientStatus,
    deployStatus: 'building' as DeployStatus,
    deployUrl: '',
    stripeStatus: 'pending' as StripeStatus,
    revenue: 0,
    meetings: 0,
    emails: 0,
    commits: 0,
    lastActivity: '',
    pulseSummary: '',
    websiteUrl: '',
    appUrl: '',
    appStoreUrl: '',
    rdUrl: '',
    housingUrl: '',
    transportationUrl: '',
    insuranceUrl: '',
    storyVideoUrl: '',
    isNewStory: false,
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [beamEntries, setBeamEntries] = useState<BeamDirectoryEntry[]>([])
  const [beamLoading, setBeamLoading] = useState(false)
  const [beamError, setBeamError] = useState<string | null>(null)
  const [selectedBeamEntryId, setSelectedBeamEntryId] = useState<string | null>(null)

  const fetchClient = () => {
    if (!clientId) return
    setLoading(true)
    fetch(`/api/clients/${encodeURIComponent(clientId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.client) {
          setClient(data.client)
          // Initialize edit form with client data
          setEditForm({
            name: data.client.name,
            storyId: data.client.storyId,
            brands: data.client.brands || [],
            status: data.client.status,
            deployStatus: data.client.deployStatus,
            deployUrl: data.client.deployUrl || '',
            stripeStatus: data.client.stripeStatus,
            revenue: data.client.revenue || 0,
            meetings: data.client.meetings || 0,
            emails: data.client.emails || 0,
            commits: data.client.commits || 0,
            lastActivity: data.client.lastActivity || '',
            pulseSummary: data.client.pulseSummary || '',
            websiteUrl: data.client.websiteUrl || '',
            appUrl: data.client.appUrl || '',
            appStoreUrl: data.client.appStoreUrl || '',
            rdUrl: data.client.rdUrl || '',
            housingUrl: data.client.housingUrl || '',
            transportationUrl: data.client.transportationUrl || '',
            insuranceUrl: data.client.insuranceUrl || '',
            storyVideoUrl: data.client.storyVideoUrl || '',
            isNewStory: data.client.isNewStory || false,
          })
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    fetchClient()
    return () => {
      cancelled = true
    }
  }, [clientId])

  const fetchUpdates = () => {
    if (!clientId) return
    setUpdatesLoading(true)
    fetch(`/api/clients/${encodeURIComponent(clientId)}/updates?limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.updates)) setUpdates(data.updates)
      })
      .finally(() => setUpdatesLoading(false))
  }

  useEffect(() => {
    if (!clientId) return
    fetchUpdates()
  }, [clientId])

  useEffect(() => {
    let cancelled = false
    setBeamLoading(true)
    setBeamError(null)

    fetch("/api/beam/website-directory/internal", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const entries = Array.isArray(data?.entries) ? (data.entries as BeamDirectoryEntry[]) : []
        setBeamEntries(entries)
        if (!data?.success) {
          setBeamError(data?.error || "Unable to sync BEAM sites right now.")
        }
      })
      .catch(() => {
        if (cancelled) return
        setBeamEntries([])
        setBeamError("Unable to sync BEAM sites right now.")
      })
      .finally(() => {
        if (!cancelled) setBeamLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (beamEntries.length === 0) {
      setSelectedBeamEntryId(null)
      return
    }
    if (!selectedBeamEntryId || !beamEntries.some((entry) => entry.id === selectedBeamEntryId)) {
      setSelectedBeamEntryId(beamEntries[0].id)
    }
  }, [beamEntries, selectedBeamEntryId])

  const handleCreateUpdate = async () => {
    if (!form.title.trim()) return
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          summary: form.summary.trim() || undefined,
          details: form.details.trim() || undefined,
          status: form.status,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create")
      setAddDialogOpen(false)
      setForm({ type: "web", title: "", summary: "", details: "", status: "draft" })
      fetchUpdates()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Failed to create update")
    }
  }

  const handlePublish = async (updateId: string) => {
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/updates/${encodeURIComponent(updateId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        }
      )
      if (!res.ok) throw new Error("Failed to publish")
      fetchUpdates()
    } catch (e) {
      console.error(e)
      alert("Failed to publish")
    }
  }

  const handleVideoUpload = async (updateId: string, file: File) => {
    setVideoUploading(updateId)
    try {
      const formData = new FormData()
      formData.append("video", file)
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/updates/${encodeURIComponent(updateId)}/video`,
        { method: "POST", body: formData }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Upload failed")
      fetchUpdates()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setVideoUploading(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!clientId) return
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          storyId: editForm.storyId.trim(),
          brands: editForm.brands,
          status: editForm.status,
          deployStatus: editForm.deployStatus,
          deployUrl: editForm.deployUrl.trim() || undefined,
          stripeStatus: editForm.stripeStatus,
          revenue: editForm.revenue,
          meetings: editForm.meetings,
          emails: editForm.emails,
          commits: editForm.commits,
          lastActivity: editForm.lastActivity.trim() || new Date().toISOString(),
          pulseSummary: editForm.pulseSummary.trim() || undefined,
          websiteUrl: editForm.websiteUrl.trim() || undefined,
          appUrl: editForm.appUrl.trim() || undefined,
          appStoreUrl: editForm.appStoreUrl.trim() || undefined,
          rdUrl: editForm.rdUrl.trim() || undefined,
          housingUrl: editForm.housingUrl.trim() || undefined,
          transportationUrl: editForm.transportationUrl.trim() || undefined,
          insuranceUrl: editForm.insuranceUrl.trim() || undefined,
          storyVideoUrl: editForm.storyVideoUrl.trim() || undefined,
          isNewStory: editForm.isNewStory,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update client')
      setEditDialogOpen(false)
      fetchClient() // Refresh client data
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to update client')
    } finally {
      setEditSubmitting(false)
    }
  }

  if (loading || !client) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-pulse text-muted-foreground">Loading…</div>
        </div>
      </DashboardLayout>
    )
  }

  const selectedBeamEntry = beamEntries.find((entry) => entry.id === selectedBeamEntryId) || null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/clients">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
              <p className="text-sm text-muted-foreground">
                {client.storyId} · {client.status}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Story ID:</strong> {client.storyId}</p>
                <p><strong>Status:</strong> {client.status}</p>
                <p><strong>Last activity:</strong> {client.lastActivity}</p>
                {client.deployUrl && (
                  <a
                    href={client.deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" /> Deploy URL
                  </a>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  BEAM Home Sites
                  <Badge className="bg-cyan-700 text-white">Read-only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Internal BEAM directory sync for site switching. Existing client data remains unchanged.
                </p>

                {beamError && (
                  <p className="text-sm text-amber-600">{beamError}</p>
                )}

                {beamLoading ? (
                  <p className="text-sm text-muted-foreground">Loading BEAM sites…</p>
                ) : beamEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No BEAM sites available yet.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Site Switch</p>
                      {beamEntries.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setSelectedBeamEntryId(entry.id)}
                          className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                            selectedBeamEntryId === entry.id
                              ? "bg-cyan-50 border-cyan-300 text-cyan-900"
                              : "bg-background border-border hover:border-cyan-200"
                          }`}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                    <div className="lg:col-span-2">
                      {selectedBeamEntry && (
                        <div className="border rounded-lg overflow-hidden bg-card">
                          {selectedBeamEntry.previewImageUrl ? (
                            <img
                              src={selectedBeamEntry.previewImageUrl}
                              alt={selectedBeamEntry.title}
                              className="w-full h-44 object-cover"
                            />
                          ) : (
                            <div className="w-full h-44 bg-muted flex items-center justify-center text-sm text-muted-foreground">
                              No preview image
                            </div>
                          )}
                          <div className="p-4">
                            <p className="font-semibold">{selectedBeamEntry.title}</p>
                            {selectedBeamEntry.subtitle && (
                              <p className="text-sm text-muted-foreground mt-1">{selectedBeamEntry.subtitle}</p>
                            )}
                            <a
                              href={selectedBeamEntry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-4 text-cyan-700 hover:text-cyan-800 font-medium"
                            >
                              Visit Site
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="updates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Updates feed</h2>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add update
              </Button>
            </div>
            {updatesLoading ? (
              <p className="text-muted-foreground text-sm">Loading updates…</p>
            ) : updates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No updates yet. Create one to show in the story module feed.
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {updates.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium">{u.title}</span>
                        <Badge variant={u.status === "published" ? "default" : "secondary"}>
                          {u.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{u.type}</span>
                      </div>
                      {u.summary && (
                        <p className="text-sm text-muted-foreground mb-2">{u.summary}</p>
                      )}
                      <p className="text-xs text-muted-foreground mb-3">
                        {new Date(u.createdAt).toLocaleString()}
                        {u.versionLabel && ` · ${u.versionLabel}`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {u.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublish(u.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Publish
                          </Button>
                        )}
                        <label className="cursor-pointer inline-block">
                          <input
                            type="file"
                            accept="video/mp4,video/*"
                            className="hidden"
                            disabled={videoUploading === u.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleVideoUpload(u.id, f)
                              e.target.value = ""
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                          >
                            {videoUploading === u.id ? (
                              "Uploading…"
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                {u.video?.publicUrl ? "Replace video" : "Upload video"}
                              </>
                            )}
                          </Button>
                        </label>
                        {u.video?.publicUrl && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={u.video.publicUrl} target="_blank" rel="noopener noreferrer">
                              Watch
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as ModuleKey }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Update title"
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Input
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Short summary"
              />
            </div>
            <div>
              <Label>Details</Label>
              <Textarea
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                placeholder="Optional details"
                rows={3}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as UpdateStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUpdate} disabled={!form.title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information in Firebase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label htmlFor="edit-storyId">Story ID *</Label>
                <Input
                  id="edit-storyId"
                  value={editForm.storyId}
                  onChange={(e) => setEditForm({ ...editForm, storyId: e.target.value })}
                  placeholder="e.g. femileasing"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-brands">Brands (comma-separated)</Label>
              <Input
                id="edit-brands"
                value={editForm.brands.join(', ')}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  brands: e.target.value.split(',').map(b => b.trim()).filter(Boolean)
                })}
                placeholder="Brand 1, Brand 2, Brand 3"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: ClientStatus) => setEditForm({ ...editForm, status: value })}
                >
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
              <div>
                <Label htmlFor="edit-deployStatus">Deploy Status</Label>
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
                <Label htmlFor="edit-stripeStatus">Stripe Status</Label>
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

            <div>
              <Label htmlFor="edit-deployUrl">Deploy URL</Label>
              <Input
                id="edit-deployUrl"
                type="url"
                value={editForm.deployUrl}
                onChange={(e) => setEditForm({ ...editForm, deployUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-websiteUrl">Website URL</Label>
                <Input
                  id="edit-websiteUrl"
                  type="url"
                  value={editForm.websiteUrl}
                  onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-appUrl">App URL</Label>
                <Input
                  id="edit-appUrl"
                  type="url"
                  value={editForm.appUrl}
                  onChange={(e) => setEditForm({ ...editForm, appUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-appStoreUrl">App Store URL</Label>
              <Input
                id="edit-appStoreUrl"
                type="url"
                value={editForm.appStoreUrl}
                onChange={(e) => setEditForm({ ...editForm, appStoreUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-rdUrl">R/D URL</Label>
                <Input
                  id="edit-rdUrl"
                  type="url"
                  value={editForm.rdUrl}
                  onChange={(e) => setEditForm({ ...editForm, rdUrl: e.target.value })}
                  placeholder="https://... (shows R/D card when set)"
                />
              </div>
              <div>
                <Label htmlFor="edit-housingUrl">Housing URL</Label>
                <Input
                  id="edit-housingUrl"
                  type="url"
                  value={editForm.housingUrl}
                  onChange={(e) => setEditForm({ ...editForm, housingUrl: e.target.value })}
                  placeholder="https://... (shows Housing card when set)"
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
                  onChange={(e) => setEditForm({ ...editForm, transportationUrl: e.target.value })}
                  placeholder="https://... (shows Transportation card when set)"
                />
              </div>
              <div>
                <Label htmlFor="edit-insuranceUrl">Insurance URL</Label>
                <Input
                  id="edit-insuranceUrl"
                  type="url"
                  value={editForm.insuranceUrl}
                  onChange={(e) => setEditForm({ ...editForm, insuranceUrl: e.target.value })}
                  placeholder="https://... (shows Insurance card when set)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-storyVideoUrl">Story Video URL</Label>
              <Input
                id="edit-storyVideoUrl"
                type="url"
                value={editForm.storyVideoUrl}
                onChange={(e) => setEditForm({ ...editForm, storyVideoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="edit-revenue">Revenue</Label>
                <Input
                  id="edit-revenue"
                  type="number"
                  value={editForm.revenue}
                  onChange={(e) => setEditForm({ ...editForm, revenue: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-meetings">Meetings</Label>
                <Input
                  id="edit-meetings"
                  type="number"
                  value={editForm.meetings}
                  onChange={(e) => setEditForm({ ...editForm, meetings: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-emails">Emails</Label>
                <Input
                  id="edit-emails"
                  type="number"
                  value={editForm.emails}
                  onChange={(e) => setEditForm({ ...editForm, emails: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-commits">Commits</Label>
                <Input
                  id="edit-commits"
                  type="number"
                  value={editForm.commits}
                  onChange={(e) => setEditForm({ ...editForm, commits: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-lastActivity">Last Activity</Label>
              <Input
                id="edit-lastActivity"
                type="datetime-local"
                value={editForm.lastActivity ? new Date(editForm.lastActivity).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  lastActivity: e.target.value ? new Date(e.target.value).toISOString() : ''
                })}
              />
            </div>

            <div>
              <Label htmlFor="edit-pulseSummary">Pulse Summary</Label>
              <Textarea
                id="edit-pulseSummary"
                value={editForm.pulseSummary}
                onChange={(e) => setEditForm({ ...editForm, pulseSummary: e.target.value })}
                placeholder="Summary of recent activity..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isNewStory"
                checked={editForm.isNewStory}
                onChange={(e) => setEditForm({ ...editForm, isNewStory: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-isNewStory" className="cursor-pointer">
                Is New Story
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editForm.name.trim() || !editForm.storyId.trim() || editSubmitting}
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
