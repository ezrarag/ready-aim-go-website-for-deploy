import type { Metadata } from "next"
import { NexusBrief } from "@/components/services/NexusBrief"

export const metadata: Metadata = {
  title: "Nexus - Web, Creative & Hardware Subscription | ReadyAimGo",
  description:
    "For $50/month, readyaimgo Nexus gives your business full web/app hosting, a professional creative team, and a dedicated Apple or Android device.",
  robots: { index: true, follow: true },
}

export default function NexusPage() {
  return <NexusBrief />
}
