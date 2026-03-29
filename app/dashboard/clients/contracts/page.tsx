import { ClientSectionScaffold } from "@/components/admin/client-section-scaffold"

export default function ClientContractsPage() {
  return (
    <ClientSectionScaffold
      title="Contracts"
      description="Keep contract state separate from general client editing and infrastructure sync."
      operationalFocus="Contracts should become the operational source of truth for signed state, renewal timing, scopes, and delivery obligations."
      nextMoves={[
        "Add contract status and renewal tracking to client records or a dedicated contract collection.",
        "Separate active, pending, and expired agreements from onboarding and website sync concerns.",
        "Use this area for contract files, signatures, and renewal alerts.",
      ]}
    />
  )
}
