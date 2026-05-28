import type { Metadata } from "next"
import { CohortBrief } from "@/components/services/CohortBrief"

export const metadata: Metadata = {
  title: "Cohort Network - Fractional Talent Subscription | ReadyAimGo",
  description:
    "For $100/month, readyaimgo Cohort Network delivers fractional access to pre-trained BEAM specialist teams - Tech, Creative, Logistics, and Forge tracks.",
  robots: { index: true, follow: true },
}

export default function CohortPage() {
  return <CohortBrief />
}
