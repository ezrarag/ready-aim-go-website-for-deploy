import { AreaOperationsPage } from "@/components/admin/area-operations-page"

export default function TransportationPage() {
  return (
    <AreaOperationsPage
      areaId="transportation"
      title="Transportation"
      description="Transportation-related records, linked websites, and assignment gaps."
      callout="Transportation is now a first-class operating area in the admin IA even though data coverage is still partial. The page currently reflects the records that can be inferred from existing client fields."
    />
  )
}
