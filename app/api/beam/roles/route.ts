import { type NextRequest, NextResponse } from "next/server"
import {
  PARTICIPANT_PATHWAYS,
  TRANSPORTATION_AREAS,
  deriveBeamParticipantRoles,
  type PublicPulseData,
} from "@/lib/beam-participants"

export const dynamic = "force-dynamic"
export const revalidate = 0

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
}

const ALLOWED_ORIGINS = new Set([
  "https://transportation.beamthinktank.space",
  "https://transport.beamthinktank.space",
  "http://localhost:3000",
  "http://localhost:3001",
])

function createHeaders(request: NextRequest) {
  const headers = new Headers(CACHE_HEADERS)
  const origin = request.headers.get("origin")

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin)
  } else {
    headers.set("Access-Control-Allow-Origin", "https://transportation.beamthinktank.space")
  }

  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  headers.set("Vary", "Origin")

  return headers
}

async function loadRoles(request: NextRequest) {
  try {
    const pulseUrl = new URL("/api/pulse", request.url)
    const response = await fetch(pulseUrl, { cache: "no-store" })

    if (!response.ok) {
      return {
        roles: deriveBeamParticipantRoles(),
        pulseData: null,
      }
    }

    const pulseData = (await response.json()) as PublicPulseData

    return {
      roles: deriveBeamParticipantRoles(pulseData),
      pulseData,
    }
  } catch {
    return {
      roles: deriveBeamParticipantRoles(),
      pulseData: null,
    }
  }
}

// Public endpoint — no API key required.
// Returns pulse-derived role demand so transport.beamthinktank.space
// can mirror the public ReadyAimGo role browser and enrollment handoff.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get("id")
  const { roles, pulseData } = await loadRoles(request)

  // Single role lookup
  if (roleId) {
    const role = roles.find((item) => item.id === roleId)
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    return NextResponse.json(
      {
        role,
        pathways: PARTICIPANT_PATHWAYS,
        transportationAreas: TRANSPORTATION_AREAS,
        pulseLastUpdated: pulseData?.lastUpdated ?? null,
        liveDemand: Boolean(pulseData && !pulseData.error),
      },
      { headers: createHeaders(request) }
    )
  }

  // All roles
  return NextResponse.json(
    {
      roles,
      count: roles.length,
      pathways: PARTICIPANT_PATHWAYS,
      transportationAreas: TRANSPORTATION_AREAS,
      source: "readyaimgo-beam-participants",
      pulseLastUpdated: pulseData?.lastUpdated ?? null,
      liveDemand: Boolean(pulseData && !pulseData.error),
    },
    {
      headers: createHeaders(request),
    }
  )
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: createHeaders(request),
  })
}
