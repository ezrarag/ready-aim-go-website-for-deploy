import type { Metadata } from "next"
import { ServiceSlugPage } from "../[slug]/page"

export const metadata: Metadata = {
  title: "Motion Network | ReadyAimGo",
  description:
    "ReadyAimGo Motion Network provides fractional fleet logistics, rides, delivery, and route coordination.",
  robots: { index: true, follow: true },
}

export default function MotionPage() {
  return <ServiceSlugPage slug="motion" />
}
