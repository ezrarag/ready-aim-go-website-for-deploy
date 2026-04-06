import type { Metadata } from "next"
import PitchDeck from "@/components/pitch/PitchDeck"

export const metadata: Metadata = {
  title: "RAG Investment Pitch | ReadyAimGo",
  description: "ReadyAimGo fleet and BEAM Transportation — family investment pitch deck.",
  robots: { index: false, follow: false },
}

export default function PitchPage() {
  return <PitchDeck />
}
