import { PropertyDetailPage } from "@/components/property-ops/property-detail-page"

export default async function PropertyOpsDetailRoute(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  return <PropertyDetailPage propertyId={params.id} />
}
