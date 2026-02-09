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
} from "lucide-react"
import type { ClientDirectoryEntry } from "@/lib/client-directory"
import type { ClientUpdate, ModuleKey, UpdateStatus } from "@/lib/client-directory"

const MODULE_TYPES: { value: ModuleKey; label: string }[] = [
  { value: "web", label: "Website" },
  { value: "app", label: "App" },
  { value: "rd", label: "R&D" },
  { value: "housing", label: "Housing" },
  { value: "transportation", label: "Transportation" },
  { value: "insurance", label: "Insurance" },
]

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const [client, setClient] = useState<ClientDirectoryEntry | null>(null)
  const [updates, setUpdates] = useState<ClientUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [videoUploading, setVideoUploading] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: "web" as ModuleKey,
    title: "",
    summary: "",
    details: "",
    status: "draft" as UpdateStatus,
  })

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/clients/${encodeURIComponent(clientId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.client) setClient(data.client)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
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

  if (loading || !client) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-pulse text-muted-foreground">Loading…</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
    </DashboardLayout>
  )
}
