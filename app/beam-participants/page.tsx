import type { Metadata } from "next"
import { PublicBeamParticipantsPage } from "@/components/beam/public-beam-participants-page"

export const metadata: Metadata = {
  title: "BEAM Participants | ReadyAimGo",
  description:
    "Browse ReadyAimGo's participant role lanes, pulse-informed staffing needs, and the bridge into BEAM Transportation.",
}

export default function BeamParticipantsPage() {
  return <PublicBeamParticipantsPage />
}
