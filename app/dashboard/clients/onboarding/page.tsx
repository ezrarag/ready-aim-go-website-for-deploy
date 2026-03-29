import { ClientSectionScaffold } from "@/components/admin/client-section-scaffold"

export default function ClientOnboardingPage() {
  return (
    <ClientSectionScaffold
      title="Client Onboarding"
      description="Track intake readiness, missing setup fields, and handoff into delivery."
      operationalFocus="This section is intended to separate onboarding readiness from live client delivery. Use it to tighten intake, required assets, and launch prerequisites."
      nextMoves={[
        "Surface missing story videos, website destinations, and GitHub/Vercel identifiers.",
        "Add explicit onboarding stages instead of inferring readiness from generic client status.",
        "Connect intake forms and initial contracts into this flow.",
      ]}
    />
  )
}
