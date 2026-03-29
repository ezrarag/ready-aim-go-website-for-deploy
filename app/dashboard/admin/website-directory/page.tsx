import DashboardLayout from "@/components/dashboard-layout"
import { VercelSyncPanel } from "@/components/admin/vercel-sync-panel"

export default function AdminWebsiteDirectoryPage() {
  return (
    <DashboardLayout>
      <VercelSyncPanel />
    </DashboardLayout>
  )
}
