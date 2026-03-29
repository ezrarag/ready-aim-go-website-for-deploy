import type { NextRequest } from "next/server"

const DEFAULT_BEAM_HOME_INTERNAL_DIRECTORY_ENDPOINT = "https://beamthinktank.space/api/website-directory/internal"

export function getBeamApiKey(): string | null {
  const value = process.env.READYAIMGO_BEAM_API_KEY?.trim()
  return value || null
}

export function isBeamRequestAuthorized(
  request: Pick<NextRequest, "headers">,
  expectedKey: string
): boolean {
  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${expectedKey}`) return true

  const apiKeyHeader = request.headers.get("x-api-key")
  return apiKeyHeader === expectedKey
}

function normalizeBaseUrl(raw: string | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  return value.replace(/\/+$/, "")
}

export function getBeamHomeInternalDirectoryEndpoints(): string[] {
  const configured = [
    normalizeBaseUrl(process.env.BEAM_HOME_BASE_URL),
    normalizeBaseUrl(process.env.BEAM_HOME_FALLBACK_BASE_URL),
  ]
    .filter((value): value is string => Boolean(value))
    .map((baseUrl) => `${baseUrl}/api/website-directory/internal`)

  return [...new Set([...configured, DEFAULT_BEAM_HOME_INTERNAL_DIRECTORY_ENDPOINT])]
}
