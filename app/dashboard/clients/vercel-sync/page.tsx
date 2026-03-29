import DashboardLayout from "@/components/dashboard-layout"
import { ClientSectionNav } from "@/components/admin/client-section-nav"
import { VercelSyncPanel } from "@/components/admin/vercel-sync-panel"

export default function VercelSyncPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ClientSectionNav />
        <VercelSyncPanel />
      </div>
    </DashboardLayout>
  )
}
