import type { Metadata } from "next"
import { ServiceSlugPage } from "../[slug]/page"

export const metadata: Metadata = {
  title: "Space Network | ReadyAimGo",
  description:
    "ReadyAimGo Space Network provides fractional workspace credits for rooms, storefronts, studios, and desks.",
  robots: { index: true, follow: true },
}

export default function SpacePage() {
  return <ServiceSlugPage slug="space" />
}
