import { AreaOperationsPage } from "@/components/admin/area-operations-page"

export default function BeamParticipantsPage() {
  return (
    <AreaOperationsPage
      areaId="beam-participants"
      title="BEAM Participants"
      description="BEAM-linked ReadyAimGo records, participant coverage, and assignment gaps."
      callout="This page currently reflects ReadyAimGo client records that classify as BEAM-related. Live BEAM Home sign-ins are not imported into this dashboard yet, so new participants created only in BEAM Home will not appear here until a dedicated participant export/import link is added."
      ctaHref="/dashboard/clients/activity"
      ctaLabel="Open Story / Activity"
    />
  )
}
