import type { Metadata } from "next"
import { ServiceSlugPage } from "../[slug]/page"

export const metadata: Metadata = {
  title: "Cohort Network | ReadyAimGo",
  description:
    "ReadyAimGo Cohort Network delivers fractional access to pre-trained BEAM specialist teams.",
  robots: { index: true, follow: true },
}

export default function CohortPage() {
  return <ServiceSlugPage slug="cohort" />
}
