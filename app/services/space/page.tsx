import type { Metadata } from "next"
import { SpaceBrief } from "@/components/services/SpaceBrief"

export const metadata: Metadata = {
  title: "Space Network - Fractional Workspace Subscription | ReadyAimGo",
  description:
    "For $100/month, the readyaimgo Space Network provides 12 Space Credits - redeemable as 2-hour blocks of meeting rooms, storefronts, studios, or desk space.",
  robots: { index: true, follow: true },
}

export default function SpacePage() {
  return <SpaceBrief />
}
