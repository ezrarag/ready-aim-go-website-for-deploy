import { ClientSectionScaffold } from "@/components/admin/client-section-scaffold"

export default function ClientAssetsPage() {
  return (
    <ClientSectionScaffold
      title="Client Assets"
      description="Collect the assets needed to operate each client relationship without mixing them into sync tooling."
      operationalFocus="This section should hold story media, brand files, core links, and other client-owned assets that delivery teams depend on."
      nextMoves={[
        "Pull story videos, logos, deployment URLs, and brand materials into one operational view.",
        "Flag which clients are missing front-end roster assets versus internal-only materials.",
        "Keep asset completeness separate from Vercel discovery and website sync actions.",
      ]}
    />
  )
}
