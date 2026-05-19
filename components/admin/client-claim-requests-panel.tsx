"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, RefreshCw, UserCheck, XCircle } from "lucide-react"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { useToast } from "@/hooks/use-toast"

type ClaimRequest = {
  id: string
  uid?: string
  email?: string
  displayName?: string | null
  requestedWorkspaceId?: string
  requestedWorkspaceName?: string
  requestedClientId?: string
  requestedClientName?: string
  requestedProjectId?: string | null
  requestedProjectName?: string | null
  evidenceNotes?: string
  status?: "pending" | "approved" | "rejected"
  approvedRole?: string
  createdAt?: string
  decidedAt?: string
}

type ClaimStatus = "pending" | "all"
type ClaimApprovalRole =
  | "collaborator"
  | "employee-of-client"
  | "beam-participant"
  | "developer"
  | "owner"

const CLAIM_APPROVAL_ROLES: Array<{ value: ClaimApprovalRole; label: string }> = [
  { value: "collaborator", label: "Collaborator" },
  { value: "employee-of-client", label: "Employee Of Client" },
  { value: "beam-participant", label: "BEAM Participant" },
  { value: "developer", label: "Developer" },
  { value: "owner", label: "Owner" },
]

function formatDate(value?: string) {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

function statusClass(status?: string) {
  if (status === "approved") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
  if (status === "rejected") return "border-red-500/30 bg-red-500/10 text-red-400"
  return "border-amber-500/30 bg-amber-500/10 text-amber-400"
}

function requestTargetName(request: ClaimRequest) {
  return (
    request.requestedWorkspaceName ||
    request.requestedClientName ||
    request.requestedWorkspaceId ||
    request.requestedClientId ||
    "Unknown workspace"
  )
}

function requestTargetId(request: ClaimRequest) {
  return request.requestedWorkspaceId || request.requestedClientId || ""
}

export function ClientClaimRequestsPanel() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<ClaimRequest[]>([])
  const [status, setStatus] = useState<ClaimStatus>("pending")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const pendingCount = useMemo(
    () => requests.filter((request) => (request.status ?? "pending") === "pending").length,
    [requests]
  )

  const loadRequests = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const response = await fetch(`/api/clients/claim-requests?status=${status}&limit=75`, {
        cache: "no-store",
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to load claim requests")
      }
      setRequests(Array.isArray(payload.requests) ? (payload.requests as ClaimRequest[]) : [])
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to load claim requests",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [status])

  const updateRequest = async (
    requestId: string,
    action: "approve" | "reject",
    role: ClaimApprovalRole = "collaborator"
  ) => {
    setActioningId(requestId)

    try {
      const response = await fetch(`/api/clients/claim-requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, role }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `Unable to ${action} claim request`)
      }

      if (status === "pending") {
        setRequests((current) => current.filter((request) => request.id !== requestId))
      } else {
        setRequests((current) =>
          current.map((request) => (request.id === requestId ? (payload.request as ClaimRequest) : request))
        )
      }

      toast({
        title: action === "approve" ? "Portal association approved" : "Portal association rejected",
        description:
          action === "approve"
            ? "The user can now resolve their client workspace from the shared users collection."
            : "The claim request was rejected.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Claim update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setActioningId(null)
    }
  }

  return (
    <AdminPanel>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AdminPanelTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Portal Workspace Approval Queue
            </AdminPanelTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Approve people who signed into the client portal and requested a workspace association.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={status === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus("pending")}
            >
              Pending
            </Button>
            <Button
              variant={status === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus("all")}
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadRequests("refresh")}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricTile label="Loaded Requests" value={requests.length} />
          <AdminMetricTile label="Pending Review" value={pendingCount} />
          <AdminMetricTile label="Review Mode" value={status === "pending" ? "Pending" : "All"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading claim requests...
          </div>
        ) : requests.length === 0 ? (
          <AdminPanelInset className="text-sm text-muted-foreground">
            No {status === "pending" ? "pending " : ""}client association requests found.
          </AdminPanelInset>
        ) : (
          requests.map((request) => {
            const requestStatus = request.status ?? "pending"
            const isPending = requestStatus === "pending"
            const isActioning = actioningId === request.id

            return (
              <AdminPanelInset key={request.id} className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {request.displayName || request.email || "Unknown portal user"}
                      </h3>
                      <Badge className={statusClass(requestStatus)}>{requestStatus}</Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{request.email || "No email captured"}</p>
                    <p className="text-sm text-muted-foreground">
                      Wants access to{" "}
                      <span className="font-medium text-foreground">
                        {requestTargetName(request)}
                      </span>
                    </p>
                    {requestTargetId(request) ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        {requestTargetId(request)}
                      </p>
                    ) : null}
                    {request.requestedProjectName || request.requestedProjectId ? (
                      <p className="text-xs text-muted-foreground">
                        Matched project: {request.requestedProjectName || request.requestedProjectId}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground lg:text-right">
                    <div>Requested {formatDate(request.createdAt)}</div>
                    {request.decidedAt ? <div>Decided {formatDate(request.decidedAt)}</div> : null}
                    {request.approvedRole ? <div>Role: {request.approvedRole}</div> : null}
                  </div>
                </div>

                {request.evidenceNotes ? (
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
                    {request.evidenceNotes}
                  </div>
                ) : null}

                {isPending ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {CLAIM_APPROVAL_ROLES.map((roleOption, index) => (
                      <Button
                        key={roleOption.value}
                        size="sm"
                        variant={index === 0 ? "default" : "outline"}
                        className={index === 0 ? "bg-emerald-600 text-white hover:bg-emerald-500" : undefined}
                        onClick={() => void updateRequest(request.id, "approve", roleOption.value)}
                        disabled={isActioning}
                      >
                        {isActioning && index === 0 ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : index === 0 ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : null}
                        Approve {roleOption.label}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => void updateRequest(request.id, "reject")}
                      disabled={isActioning}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                ) : null}
              </AdminPanelInset>
            )
          })
        )}
      </CardContent>
    </AdminPanel>
  )
}
