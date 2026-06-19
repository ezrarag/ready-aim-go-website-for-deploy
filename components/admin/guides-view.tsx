"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { AdminPanel, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Markdown } from "@/components/admin/markdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { GuideDoc, GuideMeta } from "@/lib/admin/guides"

type GuideForm = {
  slug: string
  title: string
  category: string
  summary: string
  video: string
  content: string
}

const EMPTY_FORM: GuideForm = {
  slug: "",
  title: "",
  category: "",
  summary: "",
  video: "",
  content: "",
}

export function GuidesView() {
  const [guides, setGuides] = useState<GuideMeta[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [activeGuide, setActiveGuide] = useState<GuideDoc | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [search, setSearch] = useState("")

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create")
  const [form, setForm] = useState<GuideForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadGuides = useCallback(async (selectSlug?: string) => {
    setListLoading(true)
    setListError(null)
    try {
      const res = await fetch("/api/admin/guides", { cache: "no-store" })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Guides returned ${res.status}`)
      }
      const list: GuideMeta[] = Array.isArray(payload.guides) ? payload.guides : []
      setGuides(list)
      setActiveSlug((current) => selectSlug ?? current ?? list[0]?.slug ?? null)
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Unable to load guides.")
      setGuides([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGuides()
  }, [loadGuides])

  useEffect(() => {
    if (!activeSlug) {
      setActiveGuide(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    fetch(`/api/admin/guides/${encodeURIComponent(activeSlug)}`, { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((payload) => {
        if (cancelled) return
        setActiveGuide(payload?.success === true ? (payload.guide as GuideDoc) : null)
      })
      .catch(() => {
        if (!cancelled) setActiveGuide(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeSlug])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return guides
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q)
    )
  }, [guides, search])

  const grouped = useMemo(() => {
    const map = new Map<string, GuideMeta[]>()
    for (const g of filtered) {
      const list = map.get(g.category) ?? []
      list.push(g)
      map.set(g.category, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  function openCreate() {
    setEditorMode("create")
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditorOpen(true)
  }

  function openEdit() {
    if (!activeGuide) return
    setEditorMode("edit")
    setForm({
      slug: activeGuide.slug,
      title: activeGuide.title,
      category: activeGuide.category,
      summary: activeGuide.summary,
      video: activeGuide.video,
      content: activeGuide.body,
    })
    setFormError(null)
    setEditorOpen(true)
  }

  async function save() {
    if (!form.title.trim()) {
      setFormError("Title is required.")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const isEdit = editorMode === "edit"
      const url = isEdit
        ? `/api/admin/guides/${encodeURIComponent(form.slug)}`
        : "/api/admin/guides"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category.trim() || "General",
          summary: form.summary.trim(),
          video: form.video.trim(),
          content: form.content,
          ...(isEdit ? {} : { slug: form.slug.trim() || undefined }),
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Save returned ${res.status}`)
      }
      setEditorOpen(false)
      await loadGuides(payload.slug as string)
      // Force the detail pane to refetch even if the slug is unchanged.
      setActiveGuide(null)
      setActiveSlug(payload.slug as string)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save guide.")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!activeGuide) return
    if (!window.confirm(`Delete the guide "${activeGuide.title}"? This commits a deletion to the repo.`)) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/guides/${encodeURIComponent(activeGuide.slug)}`, {
        method: "DELETE",
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Delete returned ${res.status}`)
      }
      setActiveSlug(null)
      await loadGuides()
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Unable to delete guide.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminPanel className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <AdminPanelTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Guides & How-tos
        </AdminPanelTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New guide
        </Button>
      </CardHeader>

      <CardContent className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* List */}
        <div className="space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guides..."
          />
          {listError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {listError}
            </div>
          ) : null}
          <div className="space-y-4">
            {listLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading guides...
              </div>
            ) : grouped.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                {guides.length === 0 ? "No guides yet. Create the first one." : "No guides match your search."}
              </p>
            ) : (
              grouped.map(([category, items]) => (
                <div key={category} className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {category}
                  </p>
                  {items.map((guide) => (
                    <button
                      key={guide.slug}
                      type="button"
                      onClick={() => setActiveSlug(guide.slug)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left transition",
                        activeSlug === guide.slug
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <p className="truncate text-sm font-medium text-foreground">{guide.title}</p>
                      {guide.summary ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{guide.summary}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reader */}
        <div className="min-w-0 rounded-xl border border-border p-5">
          {detailLoading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading guide...
            </div>
          ) : !activeGuide ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Select a guide to read it.</p>
          ) : (
            <article className="min-w-0">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-2">{activeGuide.category}</Badge>
                  <h2 className="text-xl font-semibold text-foreground">{activeGuide.title}</h2>
                  {activeGuide.summary ? (
                    <p className="mt-1 text-sm text-muted-foreground">{activeGuide.summary}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={openEdit}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void remove()} disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {activeGuide.video ? (
                <iframe
                  src={activeGuide.video}
                  title={`${activeGuide.title} walkthrough`}
                  className="mb-4 aspect-video w-full rounded-xl border border-border bg-black"
                />
              ) : null}

              <Markdown content={activeGuide.body} />
            </article>
          )}
        </div>
      </CardContent>

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editorMode === "edit" ? "Edit guide" : "New guide"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {formError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {formError}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="How to ..."
                />
              </Field>
              <Field label="Category">
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Coding, Compliance, Firebase..."
                  list="guide-categories"
                />
                <datalist id="guide-categories">
                  {Array.from(new Set(guides.map((g) => g.category))).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field label="Summary">
              <Input
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="One-line description shown in the list."
              />
            </Field>

            <Field label="Video / embed URL (optional)">
              <Input
                value={form.video}
                onChange={(e) => setForm((f) => ({ ...f, video: e.target.value }))}
                placeholder="/guides/my-walkthrough.html or a Loom/YouTube embed URL"
              />
            </Field>

            {editorMode === "create" ? (
              <Field label="Slug (optional — defaults from title)">
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-from-title"
                />
              </Field>
            ) : null}

            <Field label="Content (markdown)">
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={12}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="## Heading&#10;&#10;Write the guide in markdown..."
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editorMode === "edit" ? "Save changes" : "Create guide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPanel>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
