import { AreaOperationsPage } from "@/components/admin/area-operations-page"
import { FleetAdminSection } from "@/components/fleet/admin-fleet-page"

export default function TransportationPage() {
  return (
    <AreaOperationsPage
      areaId="transportation"
      title="Transportation"
      description="Transportation-related records, linked websites, assignment gaps, and live fleet administration."
      callout="Transportation is now a first-class operating area in the admin IA. In addition to the inferred client coverage below, the fleet manager now lives here as the canonical admin surface for the RAG vehicle roster."
      ctaHref="/dashboard/transportation/add-vehicle"
      ctaLabel="Add Vehicle"
    >
      <FleetAdminSection
        embedded
        redirectPath="/dashboard/transportation"
        title="RAG Fleet Manager"
        description='Manage the Firestore-backed RAG fleet here. Public changes stream into "/fleet" in real time.'
      />
    </AreaOperationsPage>
  )
}
