import DashboardLayout from "@/components/dashboard-layout"
import { OperationsSnapshotCard } from "@/components/admin/operations-snapshot-card"

export default function OperationsSnapshotPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Admin Health
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Operations snapshot</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Read-only aggregate view for linkage health, task pressure, subscriptions, and warning cleanup.
          </p>
        </div>

        <OperationsSnapshotCard />
      </div>
    </DashboardLayout>
  )
}
