import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Eye } from "lucide-react"

import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { getAdminDb } from "@/lib/firebase/admin"
import { loadAdminWorkspaceDetail } from "@/lib/admin/workspace-detail"

export const metadata: Metadata = {
  title: "Client View Mirror | ReadyAimGo",
  description: "Read-only admin mirror of the client-facing workspace surface.",
}

type Props = {
  params: Promise<{ workspaceId: string }>
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unknown"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default async function AdminWorkspaceClientViewPage(props: Props) {
  const params = await props.params
  const workspaceId = decodeURIComponent(params.workspaceId)
  const detail = await loadAdminWorkspaceDetail(getAdminDb(), workspaceId)

  if (!detail) notFound()

  const openWorkspaceHref = `/dashboard/workspaces/${encodeURIComponent(detail.workspace.id)}`
  const livePortalHref = detail.client
    ? "https://clients.readyaimgo.biz/dashboard/client"
    : null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Read-only mirror</Badge>
              {detail.workspace.showOnFrontend ? <Badge>Shown to clients</Badge> : <Badge variant="secondary">Hidden from /work</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-foreground">
              {detail.client?.name || detail.workspace.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Admin-side parity page for the client-facing workspace context. Use this to verify what the client should be seeing before you jump into the live portal.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={openWorkspaceHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to workspace
              </Link>
            </Button>
            {livePortalHref ? (
              <Button asChild variant="outline">
                <a href={livePortalHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open live portal
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile
            label="Workspace"
            value={detail.workspace.name}
            hint={detail.workspace.id}
            valueClassName="text-xl"
          />
          <AdminMetricTile
            label="Products"
            value={detail.workspace.frontEndProducts.length || 0}
            hint={detail.workspace.frontEndProducts.length ? detail.workspace.frontEndProducts.join(", ") : "No products selected"}
          />
          <AdminMetricTile
            label="Updates"
            value={detail.updates.length}
            hint={`${detail.statusVideos.length} status video${detail.statusVideos.length === 1 ? "" : "s"}`}
          />
          <AdminMetricTile
            label="Contracts"
            value={detail.contracts.length}
            hint={detail.contracts.length ? "Visible records on file" : "No contract records yet"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminPanel>
            <CardHeader>
              <AdminPanelTitle>Client-facing workspace settings</AdminPanelTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <AdminPanelInset className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{detail.client?.contactEmail || detail.client?.portalEmail || detail.workspace.clientEmail || "No contact email"}</Badge>
                  {detail.workspace.publicUrl ? <Badge variant="outline">{detail.workspace.publicUrl}</Badge> : <Badge variant="outline">Public URL missing</Badge>}
                </div>
                <p className="text-muted-foreground">
                  Products in use: {detail.workspace.frontEndProducts.length ? detail.workspace.frontEndProducts.join(", ") : "None selected"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.workspace.frontEndTags.length > 0 ? (
                    detail.workspace.frontEndTags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No showcase tags configured.</span>
                  )}
                </div>
              </AdminPanelInset>

              <AdminPanelInset className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">Portal activity feed</p>
                </div>
                {detail.updates.length === 0 ? (
                  <p className="text-muted-foreground">No updates are currently visible for this workspace.</p>
                ) : (
                  detail.updates.slice(0, 6).map((update) => (
                    <div key={update.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{update.title}</p>
                        <Badge variant="outline">{update.type}</Badge>
                      </div>
                      <p className="mt-2 text-muted-foreground">{update.summary || update.details || update.body || "No summary provided."}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {update.authorLabel || update.authorKind || "system"} · {formatDateTime(update.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </AdminPanelInset>
            </CardContent>
          </AdminPanel>

          <div className="space-y-6">
            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle>Contracts and files</AdminPanelTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.contracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contracts attached to this workspace yet.</p>
                ) : (
                  detail.contracts.slice(0, 6).map((contract) => (
                    <AdminPanelInset key={contract.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{contract.title}</p>
                        <Badge variant="outline">{contract.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {contract.type || "contract"} · {formatDateTime(contract.updatedAt)}
                      </p>
                      {contract.fileUrls[0] ? (
                        <a
                          href={contract.fileUrls[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-foreground hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open attachment
                        </a>
                      ) : null}
                    </AdminPanelInset>
                  ))
                )}
              </CardContent>
            </AdminPanel>

            <AdminPanel>
              <CardHeader>
                <AdminPanelTitle>Messages, files, and intake</AdminPanelTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{detail.messages.length} workspace message{detail.messages.length === 1 ? "" : "s"} on record.</p>
                <p>{detail.fileReferences.length} surfaced file reference{detail.fileReferences.length === 1 ? "" : "s"}.</p>
                <p>{detail.pendingInvites.length} pending invite{detail.pendingInvites.length === 1 ? "" : "s"} and {detail.members.length} active member{detail.members.length === 1 ? "" : "s"}.</p>
              </CardContent>
            </AdminPanel>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
