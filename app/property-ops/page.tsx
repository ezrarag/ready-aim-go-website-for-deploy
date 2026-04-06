import type { Metadata } from "next"
import { PublicPropertyOpsPage } from "@/components/property-ops/public-property-ops-page"

export const metadata: Metadata = {
  title: "Property Ops | ReadyAimGo",
  description:
    "Explore ReadyAimGo's property portfolio across commercial, hospitality, and civic real estate connected to BEAM Grounds.",
}

export default function PropertyOpsPage() {
  return <PublicPropertyOpsPage />
}
