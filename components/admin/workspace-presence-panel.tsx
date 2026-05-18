"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Circle,
  ExternalLink,
  Github,
  Loader2,
  RefreshCw,
  Server,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnlineUser {
  uid: string
  email: string | null
  displayName: string | null
  lastSeenAt: string
  workspaceIds: string[]
  isOnline: boolean
}

interface WorkspaceSummary {
  id: string
  name: string
  ownerUid: string
  repoCount: number
  vercelCount: number
  memberCount: number
  repos: Array<{ id: number; fullName: string; url: string; language: string | null }>
  vercelProjects: Array<{ id: string; name: string; url: string | null }>
  updatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesAgo(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000)
}

function formatLastSeen(isoString: string): string {
  const mins = minutesAgo(isoString)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ─── Online dot ───────────────────────────────────────────────────────────────

function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`}
      title={online ? "Active in the last 5 minutes" : "Offline"}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkspacePresencePanel() {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const [usersRes, workspacesRes] = await Promise.all([
        fetch("/api/admin/presence"),
        fetch("/api/admin/workspaces"),
      ])

      if (usersRes.ok) {
        const payload = (await usersRes.json()) as { users?: OnlineUser[] }
        setUsers(payload.users ?? [])
      }

      if (workspacesRes.ok) {
        const payload = (await workspacesRes.json()) as { workspaces?: WorkspaceSummary[] }
        setWorkspaces(payload.workspaces ?? [])
      }
    } catch {
      setError("Unable to load workspace data.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    // Auto-refresh presence every 30 seconds
    intervalRef.current = setInterval(() => void load(true), 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  const onlineUsers = users.filter((u) => u.isOnline)
  const offlineUsers = users.filter((u) => !u.isOnline)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Workspaces & Presence</h2>
          <p className="text-sm text-slate-500">
            {onlineUsers.length} active now · {users.length} total users · {workspaces.length} workspaces
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3 w-3" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <Tabs defaultValue="presence">
          <TabsList>
            <TabsTrigger value="presence">
              <Circle className="mr-2 h-3 w-3 fill-emerald-500 text-emerald-500" />
              Presence
            </TabsTrigger>
            <TabsTrigger value="workspaces">
              <Github className="mr-2 h-4 w-4" />
              Workspaces
            </TabsTrigger>
          </TabsList>

          {/* ── Presence tab ── */}
          <TabsContent value="presence" className="mt-4 space-y-4">
            {onlineUsers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-emerald-700">
                    Active Now ({onlineUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {onlineUsers.map((u) => (
                    <UserRow key={u.uid} user={u} workspaces={workspaces} />
                  ))}
                </CardContent>
              </Card>
            )}

            {offlineUsers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-500">
                    Recent ({offlineUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {offlineUsers.map((u) => (
                    <UserRow key={u.uid} user={u} workspaces={workspaces} />
                  ))}
                </CardContent>
              </Card>
            )}

            {users.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                No user activity recorded yet.
              </div>
            )}
          </TabsContent>

          {/* ── Workspaces tab ── */}
          <TabsContent value="workspaces" className="mt-4">
            {workspaces.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No workspaces created yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {workspaces.map((ws) => (
                  <WorkspaceCard key={ws.id} workspace={ws} users={users} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  workspaces,
}: {
  user: OnlineUser
  workspaces: WorkspaceSummary[]
}) {
  const userWorkspaces = workspaces.filter((ws) =>
    user.workspaceIds.includes(ws.id)
  )

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <PresenceDot online={user.isOnline} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {user.displayName ?? user.email ?? user.uid}
          </p>
          {user.displayName && user.email && (
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          )}
          <p className="text-xs text-slate-400">{formatLastSeen(user.lastSeenAt)}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">
        {userWorkspaces.map((ws) => (
          <Badge key={ws.id} variant="secondary" className="text-xs">
            {ws.name}
          </Badge>
        ))}
        {user.workspaceIds.length === 0 && (
          <Badge variant="secondary" className="text-xs text-amber-700">
            No workspace
          </Badge>
        )}
      </div>
    </div>
  )
}

// ─── Workspace Card ───────────────────────────────────────────────────────────

function WorkspaceCard({
  workspace,
  users,
}: {
  workspace: WorkspaceSummary
  users: OnlineUser[]
}) {
  const members = users.filter((u) => u.workspaceIds.includes(workspace.id))
  const onlineCount = members.filter((u) => u.isOnline).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{workspace.name}</CardTitle>
            <CardDescription className="font-mono text-xs">{workspace.id}</CardDescription>
          </div>
          {onlineCount > 0 && (
            <Badge className="shrink-0 bg-emerald-100 text-xs text-emerald-700">
              {onlineCount} online
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Badge variant="secondary">
            <Github className="mr-1 h-3 w-3" />
            {workspace.repoCount} repo{workspace.repoCount !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary">
            <Server className="mr-1 h-3 w-3" />
            {workspace.vercelCount} Vercel
          </Badge>
          <Badge variant="secondary">
            <Users className="mr-1 h-3 w-3" />
            {workspace.memberCount}
          </Badge>
        </div>

        {workspace.repos.length > 0 && (
          <div className="space-y-1">
            {workspace.repos.slice(0, 3).map((repo) => (
              <a
                key={repo.id}
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate text-xs text-slate-500 hover:text-slate-800"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {repo.fullName}
                {repo.language && (
                  <span className="ml-1 text-slate-400">({repo.language})</span>
                )}
              </a>
            ))}
          </div>
        )}

        {workspace.vercelProjects.length > 0 && (
          <div className="space-y-1">
            {workspace.vercelProjects.slice(0, 2).map((p) => (
              <a
                key={p.id}
                href={p.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 truncate text-xs text-slate-500 hover:text-slate-800"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {p.name}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
