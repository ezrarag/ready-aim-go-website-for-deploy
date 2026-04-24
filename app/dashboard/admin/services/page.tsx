import DashboardLayout from "@/components/dashboard-layout"
import { ServicesCostTracker } from "@/components/admin/services-cost-tracker"

export default function AdminServicesPage() {
  return (
    <DashboardLayout>
      <ServicesCostTracker />
    </DashboardLayout>
  )
}
