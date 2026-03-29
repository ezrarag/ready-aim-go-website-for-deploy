import { ClientSectionScaffold } from "@/components/admin/client-section-scaffold"

export default function ClientActivityPage() {
  return (
    <ClientSectionScaffold
      title="Client Story / Activity"
      description="A dedicated area for client narrative, pulse updates, and visible activity instead of generic dashboard noise."
      operationalFocus="This page should evolve into the client-side activity and story layer: pulse summaries, client updates, delivery highlights, and public story readiness."
      nextMoves={[
        "Aggregate pulse summaries and published client updates into one story/activity timeline.",
        "Highlight missing story assets and stale activity coverage.",
        "Separate narrative/status communication from raw infrastructure sync.",
      ]}
    />
  )
}
