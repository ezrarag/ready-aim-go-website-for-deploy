"use client"

import { useState } from "react"
import { Sparkles, Terminal, Play, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface GitReleaseEngineProps {
  workspaceId: string
  onPublished?: () => void
}

export function GitReleaseEngine({ workspaceId, onPublished }: GitReleaseEngineProps) {
  const [commitRange, setCommitRange] = useState("HEAD~5..HEAD")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<any | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setSuccessResult(null)

    try {
      const res = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}/release-notes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitRange }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate release notes package.")
      }

      setSuccessResult(data.update)
      if (onPublished) onPublished()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error running release compilation.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-foreground">Git Commit Release Ingestion Engine</h3>
        </div>
        <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
          Gemini / Claude AI
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Input a Git commit range or tag comparison. The engine scans commit logs and code diffs, generates client-friendly release notes, builds interactive feature sandboxes, and synthesizes a NotebookLM-style Audio Overview.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="e.g. HEAD~5..HEAD or v1.1..v1.2"
          value={commitRange}
          onChange={(e) => setCommitRange(e.target.value)}
          className="font-mono text-xs max-w-[280px]"
          disabled={loading}
        />
        <Button onClick={handleGenerate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs">
          <Sparkles className="h-4 w-4" />
          {loading ? "Synthesizing Update..." : "Analyze & Synthesize Overview"}
        </Button>
      </div>

      {error && (
        <div className="rounded bg-rose-500/10 border border-rose-500/20 p-3 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successResult && (
        <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-semibold">Successfully compiled and published updates!</span>
          </div>
          <div className="bg-card/50 p-2.5 rounded border space-y-1">
            <p className="font-medium text-foreground">{successResult.title}</p>
            <p className="text-muted-foreground leading-relaxed text-[11px] truncate max-w-full">
              {successResult.description}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Surfaced automatically in the Client Portal with Audio Overview and interactive sandbox features.
          </p>
        </div>
      )}
    </div>
  )
}
