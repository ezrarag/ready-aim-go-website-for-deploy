import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Eye, FileText, Pencil, ReceiptText, Settings } from "lucide-react"

import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelTitle } from "@/components/admin/admin-panel"
import { WorkspaceProjectControlCenter } from "@/components/admin/workspace-project-control-center"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader } from "@/components/ui/card"
import { getAdminDb } from "@/lib/firebase/admin"
import { loadAdminWorkspaceDetail } from "@/lib/admin/workspace-detail"

export const metadata: Metadata = {
  title: "Workspace Operations | ReadyAimGo",
  description: "Dedicated workspace operations mirror for the ReadyAimGo admin dashboard.",
}

type Props = {
  params: Promise<{ workspaceId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminWorkspaceDetailPage(props: Props) {
  const params = await props.params
  const searchParams = props.searchParams ? await props.searchParams : undefined
  const workspaceId = decodeURIComponent(params.workspaceId)
  const requestedTab = typeof searchParams?.tab === "string" ? searchParams.tab : undefined
  const detail = await loadAdminWorkspaceDetail(getAdminDb(), workspaceId)

  if (!detail) {
    notFound()
  }

  const quickEditHref = `/dashboard?view=workspaces&workspace=${encodeURIComponent(workspaceId)}&panel=edit`
  const quickReposHref = `/dashboard?view=workspaces&workspace=${encodeURIComponent(workspaceId)}&panel=repos`
  const clientViewHref = `/dashboard/workspaces/${encodeURIComponent(workspaceId)}/client-view`
  const uploadContractHref = `/dashboard/workspaces/${encodeURIComponent(workspaceId)}?tab=contracts`
  const createInvoiceHref = `/dashboard/workspaces/${encodeURIComponent(workspaceId)}?tab=deliverables`

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Workspace detail</Badge>
              {detail.workspace.showOnFrontend ? <Badge>Shown on /work</Badge> : <Badge variant="secondary">Hidden from /work</Badge>}
              {detail.client ? <Badge variant="outline">Client linked</Badge> : <Badge variant="outline">Client unlinked</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-foreground">{detail.workspace.name}</h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{detail.workspace.id}</p>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Visibility-first workspace operations mirror. This page is the primary admin view for project state, intake, updates, team, contracts, retainer status, and repo/hosting linkage.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard?view=workspaces">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspaces
              </Link>
            </Button>
            {detail.client ? (
              <Button asChild variant="outline">
                <Link href={clientViewHref}>
                  <Eye className="mr-2 h-4 w-4" />
                  See Client View
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={uploadContractHref}>
                <FileText className="mr-2 h-4 w-4" />
                Upload contract
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={createInvoiceHref}>
                <ReceiptText className="mr-2 h-4 w-4" />
                Create invoice
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={quickEditHref}>
                <Pencil className="mr-2 h-4 w-4" />
                Quick Edit
              </Link>
            </Button>
            <Button asChild>
              <Link href={quickReposHref}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Repos
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile
            label="Canonical client"
            value={detail.client?.name || "Unlinked"}
            hint={detail.client?.id || "Link a client from quick edit"}
          />
          <AdminMetricTile
            label="Contracts"
            value={String(detail.contracts.length)}
            hint={detail.contracts.length > 0 ? "Read-only contract visibility" : "No contracts linked yet"}
          />
          <AdminMetricTile
            label="Updates"
            value={String(detail.updates.length)}
            hint={`${detail.statusVideos.length} status video${detail.statusVideos.length === 1 ? "" : "s"}`}
          />
          <AdminMetricTile
            label="Team"
            value={String(detail.members.length)}
            hint={`${detail.pendingInvites.length} pending invite${detail.pendingInvites.length === 1 ? "" : "s"}`}
          />
        </div>

        <AdminPanel>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <AdminPanelTitle>Workspace Summary</AdminPanelTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Shared admin context for this workspace before you drill into the tabbed operations surface.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.workspace.publicUrl ? (
                <Badge variant="outline">{detail.workspace.publicUrl}</Badge>
              ) : detail.workspace.suggestedPublicUrl ? (
                <Badge variant="outline">Suggested URL: {detail.workspace.suggestedPublicUrl}</Badge>
              ) : (
                <Badge variant="outline">Public URL missing</Badge>
              )}
              {detail.workspace.frontEndTags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Client: {detail.client ? `${detail.client.name} (${detail.client.id})` : "No canonical client linked"}
            </p>
            <p>
              Contact: {detail.client?.contactEmail || detail.workspace.clientEmail || detail.client?.portalEmail || "No contact email on record"}
            </p>
            <p>
              Front-end products: {detail.workspace.frontEndProducts.length > 0 ? detail.workspace.frontEndProducts.join(", ") : "None configured"}
            </p>
          </CardContent>
        </AdminPanel>

        <WorkspaceProjectControlCenter
          clientId={detail.client?.id || null}
          workspaceId={detail.workspace.id}
          workspaceName={detail.workspace.name}
          detail={detail}
          quickEditHref={quickEditHref}
          quickReposHref={quickReposHref}
          initialTab={requestedTab}
        />
      </div>
    </DashboardLayout>
  )
}
