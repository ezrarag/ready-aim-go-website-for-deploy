"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskStatus = "pending" | "in-progress" | "blocked" | "done"
type TaskCategory = "env" | "setup" | "feature" | "ops" | "qa" | "planning"

type BuildTask = {
  id: string
  title: string
  category: TaskCategory
  status: TaskStatus
  createdAt: string
}

type BuildProject = {
  id: string
  name: string
  repo: string
  url: string | null
  color: string
  description: string
  tasks: BuildTask[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "border-slate-500/30 bg-slate-500/10 text-slate-400",
    icon: <Circle className="h-3 w-3" />,
  },
  "in-progress": {
    label: "In Progress",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  blocked: {
    label: "Blocked",
    color: "border-red-500/30 bg-red-500/10 text-red-400",
    icon: <Circle className="h-3 w-3 fill-red-400" />,
  },
  done: {
    label: "Done",
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: <Check className="h-3 w-3" />,
  },
}

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string }> = {
  env: { label: "Env Vars", color: "text-yellow-400" },
  setup: { label: "Setup", color: "text-blue-400" },
  feature: { label: "Feature", color: "text-purple-400" },
  ops: { label: "Ops", color: "text-orange-400" },
  qa: { label: "QA", color: "text-teal-400" },
  planning: { label: "Planning", color: "text-slate-400" },
}

const PROJECT_COLORS: Record<string, string> = {
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  green: "border-green-500/30 bg-green-500/10 text-green-400",
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-400",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  gold: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  slate: "border-slate-500/30 bg-slate-500/10 text-slate-400",
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  projectId,
  onStatusChange,
}: {
  task: BuildTask
  projectId: string
  onStatusChange: (projectId: string, taskId: string, status: TaskStatus) => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)
  const status = STATUS_CONFIG[task.status]
  const category = CATEGORY_CONFIG[task.category]

  const cycleStatus = async () => {
    const order: TaskStatus[] = ["pending", "in-progress", "blocked", "done"]
    const next = order[(order.indexOf(task.status) + 1) % order.length]
    setUpdating(true)
    await onStatusChange(projectId, task.id, next)
    setUpdating(false)
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5 hover:bg-card/80 transition-colors">
      <button
        onClick={cycleStatus}
        disabled={updating}
        className="mt-0.5 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        title="Click to cycle status"
      >
        {updating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          status.icon
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-medium ${category.color}`}>
            <Tag className="h-2.5 w-2.5 inline mr-0.5" />
            {category.label}
          </span>
        </div>
      </div>

      <Badge className={`border text-xs shrink-0 ${status.color}`}>
        {status.label}
      </Badge>
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onStatusChange,
  onAddTask,
  onGeneratePrompt,
}: {
  project: BuildProject
  onStatusChange: (projectId: string, taskId: string, status: TaskStatus) => Promise<void>
  onAddTask: (projectId: string) => void
  onGeneratePrompt: (project: BuildProject) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const colorClass = PROJECT_COLORS[project.color] ?? PROJECT_COLORS.slate

  const pending = project.tasks.filter((t) => t.status === "pending").length
  const inProgress = project.tasks.filter((t) => t.status === "in-progress").length
  const blocked = project.tasks.filter((t) => t.status === "blocked").length
  const done = project.tasks.filter((t) => t.status === "done").length
  const total = project.tasks.length

  // Group tasks by category for display
  const byCategory = project.tasks.reduce<Record<string, BuildTask[]>>((acc, task) => {
    if (!acc[task.category]) acc[task.category] = []
    acc[task.category].push(task)
    return acc
  }, {})

  return (
    <AdminPanel>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border ${colorClass}`}>
              <span className="text-xs font-bold">{project.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <AdminPanelTitle className="text-base">{project.name}</AdminPanelTitle>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {inProgress > 0 && <span className="text-blue-400">{inProgress} in progress</span>}
                {blocked > 0 && <span className="text-red-400">{blocked} blocked</span>}
                {pending > 0 && <span>{pending} pending</span>}
                <span className="text-emerald-400">{done}/{total} done</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onGeneratePrompt(project)}
              title="Generate Claude prompt for this project"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-400" />
              Prompt
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onAddTask(project.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {Object.entries(byCategory).map(([cat, tasks]) => (
            <div key={cat} className="space-y-1.5">
              <p className={`text-xs font-semibold uppercase tracking-widest ${CATEGORY_CONFIG[cat as TaskCategory]?.color ?? "text-muted-foreground"}`}>
                {CATEGORY_CONFIG[cat as TaskCategory]?.label ?? cat}
              </p>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projectId={project.id}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          ))}

          {project.tasks.length === 0 && (
            <AdminPanelInset>
              <p className="text-sm text-muted-foreground text-center">No tasks yet. Add one above.</p>
            </AdminPanelInset>
          )}
        </CardContent>
      )}
    </AdminPanel>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BuildTracker() {
  const [projects, setProjects] = useState<BuildProject[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

  // Add task dialog
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>("feature")
  const [savingTask, setSavingTask] = useState(false)

  // Claude prompt dialog
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptProject, setPromptProject] = useState<BuildProject | null>(null)
  const [promptFocus, setPromptFocus] = useState("")
  const [promptContext, setPromptContext] = useState("")
  const [generatedPrompt, setGeneratedPrompt] = useState("")
  const [generatingPrompt, setGeneratingPrompt] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/build-tracker")
      const data = await res.json()
      setProjects(data.projects ?? [])
      setSeeded(data.seeded ?? false)
    } catch {
      toast.error("Failed to load build tracker.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchProjects() }, [fetchProjects])

  const handleStatusChange = async (projectId: string, taskId: string, status: TaskStatus) => {
    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }
          : p
      )
    )
    await fetch("/api/build-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateTaskStatus", projectId, taskId, status }),
    })
  }

  const handleAddTask = async () => {
    if (!addTaskProjectId || !newTaskTitle.trim()) return
    setSavingTask(true)
    try {
      const res = await fetch("/api/build-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addTask",
          projectId: addTaskProjectId,
          title: newTaskTitle.trim(),
          category: newTaskCategory,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success("Task added.")
        setAddTaskOpen(false)
        setNewTaskTitle("")
        setNewTaskCategory("feature")
        await fetchProjects()
      }
    } finally {
      setSavingTask(false)
    }
  }

  const handleGeneratePrompt = async () => {
    if (!promptProject || !promptFocus.trim()) return
    setGeneratingPrompt(true)
    setGeneratedPrompt("")
    try {
      const res = await fetch("/api/build-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generatePrompt",
          projectName: promptProject.name,
          repo: promptProject.repo,
          focusArea: promptFocus,
          context: promptContext,
        }),
      })
      const data = await res.json()
      setGeneratedPrompt(data.prompt ?? "")
    } finally {
      setGeneratingPrompt(false)
    }
  }

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0)
  const doneTasks = projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "done").length, 0)
  const blockedTasks = projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "blocked").length, 0)
  const envTasks = projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.category === "env" && t.status === "pending").length, 0)

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.15),_transparent_58%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.10),_transparent_34%)]" />

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Build Tracker</h1>
            <p className="text-sm text-muted-foreground">
              Every RAG project, every next step, and a Claude prompt generator for each one.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-border/70 bg-card/80"
          onClick={fetchProjects}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {seeded && (
        <Badge className="border border-purple-500/30 bg-purple-500/10 text-purple-400">
          Auto-seeded with current RAG project state from conversation history.
        </Badge>
      )}

      {/* Summary */}
      <AdminPanel>
        <CardHeader><AdminPanelTitle>Overview</AdminPanelTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <AdminMetricTile
            label="Total Tasks"
            value={totalTasks}
            hint={`Across ${projects.length} projects`}
            labelClassName="text-xs uppercase tracking-[0.2em]"
          />
          <AdminMetricTile
            label="Completed"
            value={doneTasks}
            hint={`${totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% done`}
            labelClassName="text-xs uppercase tracking-[0.2em]"
            valueClassName="text-emerald-400"
          />
          <AdminMetricTile
            label="Blocked"
            value={blockedTasks}
            hint="Needs attention"
            labelClassName="text-xs uppercase tracking-[0.2em]"
            valueClassName={blockedTasks > 0 ? "text-red-400" : undefined}
          />
          <AdminMetricTile
            label="Env Vars Pending"
            value={envTasks}
            hint="Missing environment variables"
            labelClassName="text-xs uppercase tracking-[0.2em]"
            valueClassName={envTasks > 0 ? "text-yellow-400" : undefined}
          />
        </CardContent>
      </AdminPanel>

      {/* Project cards */}
      {loading ? (
        <AdminPanel>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-purple-400" />
            Loading build tracker from Firestore...
          </CardContent>
        </AdminPanel>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusChange={handleStatusChange}
              onAddTask={(id) => { setAddTaskProjectId(id); setAddTaskOpen(true) }}
              onGeneratePrompt={(p) => { setPromptProject(p); setPromptFocus(""); setGeneratedPrompt(""); setPromptOpen(true) }}
            />
          ))}
        </div>
      )}

      {/* Add task dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Add a new task to {projects.find((p) => p.id === addTaskProjectId)?.name ?? "this project"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Task title</Label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What needs to be done?"
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddTask() }}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newTaskCategory} onValueChange={(v) => setNewTaskCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAddTask()} disabled={savingTask || !newTaskTitle.trim()}>
              {savingTask ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claude prompt generator dialog */}
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="border-border bg-background sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Generate Claude Prompt
            </DialogTitle>
            <DialogDescription>
              Describe what you want to work on in {promptProject?.name}. Claude generates a paste-ready prompt for Claude Desktop or Codex.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>What do you want to work on?</Label>
              <Input
                value={promptFocus}
                onChange={(e) => setPromptFocus(e.target.value)}
                placeholder="e.g. Build the value-profile page for clients, Fix the Outlook sync auth flow"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional context (optional)</Label>
              <Textarea
                value={promptContext}
                onChange={(e) => setPromptContext(e.target.value)}
                placeholder="Any relevant file paths, constraints, or things Claude should know..."
                rows={3}
              />
            </div>

            {generatedPrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Generated prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPrompt)
                      toast.success("Prompt copied to clipboard.")
                    }}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {generatedPrompt}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptOpen(false)}>Close</Button>
            <Button
              onClick={() => void handleGeneratePrompt()}
              disabled={generatingPrompt || !promptFocus.trim()}
              className="bg-purple-600 text-white hover:bg-purple-500"
            >
              {generatingPrompt ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
