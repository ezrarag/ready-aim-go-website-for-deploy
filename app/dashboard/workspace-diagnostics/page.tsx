import DashboardLayout from "@/components/dashboard-layout"
import { WorkspaceDiagnosticsCard } from "@/components/admin/workspace-diagnostics-card"

export default function WorkspaceDiagnosticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Workspace Health
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Workspace diagnostics</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Duplicate workspace audit, Drive scan diagnostics, and portal visibility verification moved off the main workspaces page.
          </p>
        </div>
        <WorkspaceDiagnosticsCard />
      </div>
    </DashboardLayout>
  )
}
