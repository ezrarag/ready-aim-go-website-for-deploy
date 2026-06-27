"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Github, Loader2, Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type AdminGitHubRepo = {
  id: number
  fullName: string
  htmlUrl: string
  description: string | null
  language: string | null
  private: boolean
  updatedAt: string | null
  alreadyConnected?: boolean
  connectedClientId?: string | null
  connectedClientName?: string | null
}

export function RepoConnectModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after one or more clients are created. */
  onCreated: () => void
}) {
  const [repos, setRepos] = useState<AdminGitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/github-repos", { cache: "no-store" })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || payload?.success !== true) {
        throw new Error(payload?.error || `GitHub repos returned ${res.status}`)
      }
      setRepos(Array.isArray(payload.repos) ? payload.repos : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load repositories.")
      setRepos([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset + load whenever the modal opens.
  useEffect(() => {
    if (!open) return
    setSearch("")
    setSelectedIds([])
    void load()
  }, [open, load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return repos
    return repos.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(q) ||
        (repo.description ?? "").toLowerCase().includes(q)
    )
  }, [repos, search])

  const selectedRepos = useMemo(
    () => repos.filter((repo) => selectedIds.includes(repo.id)),
    [repos, selectedIds]
  )

  function toggleRepo(repoId: number) {
    setSelectedIds((current) =>
      current.includes(repoId)
        ? current.filter((id) => id !== repoId)
        : [...current, repoId]
    )
  }

  async function createClient() {
    if (selectedRepos.length === 0) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/clients/from-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repos: selectedRepos.map((repo) => ({
            repoFullName: repo.fullName,
            repoId: repo.id,
            htmlUrl: repo.htmlUrl,
          })),
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Create client returned ${res.status}`)
      }
      onCreated()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create client.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Connect a repo → new client
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search repositories..."
          />

          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading repositories...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {repos.length === 0 ? "No repositories found." : "No repositories match your search."}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((repo) => {
                  const isSelected = selectedIds.includes(repo.id)
                  return (
                    <li key={repo.id}>
                      <button
                        type="button"
                        onClick={() => toggleRepo(repo.id)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/40",
                          isSelected && "bg-primary/10"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {repo.fullName}
                            </span>
                            {repo.private ? (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Lock className="h-3 w-3" />
                                Private
                              </Badge>
                            ) : null}
                            {repo.language ? (
                              <Badge variant="outline" className="text-[10px]">
                                {repo.language}
                              </Badge>
                            ) : null}
                          </div>
                          {repo.description ? (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {repo.description}
                            </p>
                          ) : null}
                        </div>
                        {isSelected ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {selectedRepos.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              {selectedRepos.length} {selectedRepos.length === 1 ? "repo" : "repos"} selected. Each selected repo will create a new client and linked workspace.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={() => void createClient()} disabled={selectedRepos.length === 0 || creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create {selectedRepos.length > 1 ? "clients" : "client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
