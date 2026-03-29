import { type NextRequest, NextResponse } from "next/server"
import { getBeamApiKey, isBeamRequestAuthorized } from "@/lib/beam-api"

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

  // Minimal stub for BEAM Home integration. Keep read-only.
  return NextResponse.json(
    {
      roles: [],
      count: 0,
      source: "readyaimgo-minimal-stub",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
