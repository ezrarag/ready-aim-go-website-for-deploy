import type { Metadata } from "next"
import { PublicFleetPage } from "@/components/fleet/public-fleet-page"

export const metadata: Metadata = {
  title: "Fleet | ReadyAimGo",
  description:
    "Explore ReadyAimGo's live fleet, wishlist, and restore projects maintained by BEAM Transportation cohort participants.",
}

export default function FleetPage() {
  return <PublicFleetPage />
}
