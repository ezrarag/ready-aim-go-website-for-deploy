import type { Metadata } from "next"
import { ServicesHub } from "@/components/services/ServicesHub"

export const metadata: Metadata = {
  title: "Services | ReadyAimGo",
  description:
    "Nexus, Motion Network, Space Network, and Cohort Network - four subscription service areas powering the readyaimgo ecosystem.",
  robots: { index: true, follow: true },
}

export default function ServicesPage() {
  return <ServicesHub />
}
