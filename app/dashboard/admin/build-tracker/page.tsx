import DashboardLayout from "@/components/dashboard-layout"
import { BuildTracker } from "@/components/admin/build-tracker"

export default function BuildTrackerPage() {
  return (
    <DashboardLayout>
      <BuildTracker />
    </DashboardLayout>
  )
}
