import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

function isAuthorized(request: NextRequest, expectedKey: string): boolean {
  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${expectedKey}`) return true

  // Optional compatibility for callers using x-api-key.
  const apiKeyHeader = request.headers.get("x-api-key")
  return apiKeyHeader === expectedKey
}

export async function GET(request: NextRequest) {
  const expectedKey = process.env.READYAIMGO_BEAM_API_KEY?.trim()

  if (!expectedKey) {
    return NextResponse.json(
      { error: "Server misconfigured: READYAIMGO_BEAM_API_KEY is missing" },
      { status: 503 }
    )
  }

  if (!isAuthorized(request, expectedKey)) {
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
