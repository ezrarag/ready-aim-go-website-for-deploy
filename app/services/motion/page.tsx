import type { Metadata } from "next"
import { MotionBrief } from "@/components/services/MotionBrief"

export const metadata: Metadata = {
  title: "Motion Network - Fleet Logistics Subscription | ReadyAimGo",
  description:
    "For $100/month, the readyaimgo Motion Network provides fractional fleet logistics - rides, delivery, and scheduling - powered by BEAM drivers.",
  robots: { index: true, follow: true },
}

export default function MotionPage() {
  return <MotionBrief />
}
