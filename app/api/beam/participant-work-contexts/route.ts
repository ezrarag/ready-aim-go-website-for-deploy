import { type NextRequest, NextResponse } from "next/server"
import { getBeamApiKey, isBeamRequestAuthorized } from "@/lib/beam-api"
import { listBeamParticipantWorkContextExports } from "@/lib/beam-participant-contexts"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  const expectedKey = getBeamApiKey()

  if (!expectedKey) {
    return NextResponse.json(
      { error: "Server misconfigured: READYAIMGO_BEAM_API_KEY is missing" },
      { status: 503 }
    )
  }

  if (!isBeamRequestAuthorized(request, expectedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")?.trim()
    const storyId = searchParams.get("storyId")?.trim()
    const eligibleOnly = searchParams.get("eligibleOnly") === "true"

    let participants = await listBeamParticipantWorkContextExports()

    if (clientId) {
      participants = participants.filter((entry) => entry.sourceClientDocId === clientId)
    }

    if (storyId) {
      participants = participants.filter((entry) => entry.sourceStoryId === storyId)
    }

    if (eligibleOnly) {
      participants = participants.filter((entry) => entry.workContexts.length > 0)
    }

    return NextResponse.json(
      {
        success: true,
        source: "readyaimgo-firestore-clients",
        generatedAt: new Date().toISOString(),
        participants,
        count: participants.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export participant work contexts",
      },
      { status: 500 }
    )
  }
}
