import DashboardLayout from "@/components/dashboard-layout"
import { ClientSectionNav } from "@/components/admin/client-section-nav"
import { BeamPortalAccessPanel } from "@/components/admin/beam-portal-access-panel"

export default function ClientAccessPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ClientSectionNav />
        <BeamPortalAccessPanel />
      </div>
    </DashboardLayout>
  )
}
