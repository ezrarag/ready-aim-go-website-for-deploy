import type { NextRequest } from "next/server"
import { isBeamRequestAuthorized } from "@/lib/beam-api"

export function getInternalMutationApiKey(): string | null {
  const value = process.env.READYAIMGO_INTERNAL_API_KEY?.trim()
  return value || null
}

function hasSameOriginHeaders(request: Pick<NextRequest, "headers" | "nextUrl">): boolean {
  const expectedOrigin = request.nextUrl.origin

  const origin = request.headers.get("origin")
  if (origin && origin === expectedOrigin) {
    return true
  }

  const referer = request.headers.get("referer")
  if (referer) {
    try {
      if (new URL(referer).origin === expectedOrigin) {
        return true
      }
    } catch {
      return false
    }
  }

  return false
}

export function isInternalMutationAuthorized(
  request: Pick<NextRequest, "headers" | "nextUrl">
): boolean {
  const expectedKey = getInternalMutationApiKey()
  if (expectedKey && isBeamRequestAuthorized(request, expectedKey)) {
    return true
  }

  return hasSameOriginHeaders(request)
}

/**
 * Read authorization for internal/admin GET routes.
 * Accepts the same API-key header as mutations OR same-origin requests.
 * Keeping this separate so read vs. write permissions can diverge later.
 */
export function isInternalReadAuthorized(
  request: Pick<NextRequest, "headers" | "nextUrl">
): boolean {
  const expectedKey = getInternalMutationApiKey()
  if (expectedKey && isBeamRequestAuthorized(request, expectedKey)) {
    return true
  }

  return hasSameOriginHeaders(request)
}
