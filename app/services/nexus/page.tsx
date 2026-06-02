import type { Metadata } from "next"
import { ServiceSlugPage } from "../[slug]/page"

export const metadata: Metadata = {
  title: "Nexus | ReadyAimGo",
  description:
    "ReadyAimGo Nexus bundles web/app infrastructure, creative support, and a dedicated device path.",
  robots: { index: true, follow: true },
}

export default function NexusPage() {
  return <ServiceSlugPage slug="nexus" />
}
