import { PublicFleetPage } from "@/components/fleet/public-fleet-page"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Fleet | ReadyAimGo",
  description: "Browse ReadyAimGo's BEAM-maintained vehicle fleet. SUVs, cargo trucks, and more across Milwaukee, Chicago, Atlanta, Orlando, and Madison.",
}

export default function FleetPage() {
  return <PublicFleetPage />
}
