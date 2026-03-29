import { type NextRequest, NextResponse } from "next/server"
import { getBeamApiKey, isBeamRequestAuthorized } from "@/lib/beam-api"
import {
  BEAM_CANONICAL_ORGANIZATION_FIELDS,
  listBeamOrganizationCandidates,
  READYAIMGO_SITE_METADATA_FIELDS,
} from "@/lib/beam-organizations"

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

    let organizations = await listBeamOrganizationCandidates()

    if (clientId) {
      organizations = organizations.filter((entry) => entry.source.documentId === clientId)
    }

    if (storyId) {
      organizations = organizations.filter((entry) => entry.source.storyId === storyId)
    }

    if (eligibleOnly) {
      organizations = organizations.filter((entry) => entry.enrichmentReadiness.organizationCandidate.eligible)
    }

    return NextResponse.json(
      {
        success: true,
        source: "readyaimgo-firestore-clients",
        generatedAt: new Date().toISOString(),
        canonicalOrganizationFields: BEAM_CANONICAL_ORGANIZATION_FIELDS,
        siteMetadataOnlyFields: READYAIMGO_SITE_METADATA_FIELDS,
        organizations,
        count: organizations.length,
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
        error: error instanceof Error ? error.message : "Failed to export organization candidates",
      },
      { status: 500 }
    )
  }
}
