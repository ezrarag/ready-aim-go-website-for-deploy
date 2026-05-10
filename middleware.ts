/**
 * Next.js Edge Middleware — Portal Route Protection
 *
 * Constraints: Middleware runs on the Edge Runtime. Firebase Admin SDK
 * (Firestore, Auth Admin) is NOT available here. Full revocation checks
 * (ragAllowlist.active) are enforced in resolvePortalIdentity() inside each
 * API route handler. This middleware handles:
 *
 *  1. /api/portal/*  — Reject requests with no Authorization header early
 *     (saves a round-trip to Firestore for obviously unauthenticated callers).
 *
 *  2. /dashboard/client* — Check for the `portal_revoked` cookie. This cookie
 *     is written by the portal hooks (useClientProjects, useMissions, etc.)
 *     whenever the portal API returns 401/403. If present, redirect immediately
 *     to /no-access rather than letting the page render and then redirect.
 *
 *  3. /no-access — Always allow (no loop).
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PORTAL_PAGE_PATHS = ["/dashboard/client"]
const PORTAL_API_PREFIX = "/api/portal"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Portal API: require Authorization header ───────────────────────────
  if (pathname.startsWith(PORTAL_API_PREFIX)) {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }
    // Bearer token present — pass through to the route handler for full
    // Firebase token verification and ragAllowlist.active check.
    return NextResponse.next()
  }

  // ── 2. Portal pages: check revocation cookie ─────────────────────────────
  if (PORTAL_PAGE_PATHS.some((p) => pathname.startsWith(p))) {
    const revoked = req.cookies.get("portal_revoked")?.value
    if (revoked === "1") {
      const url = req.nextUrl.clone()
      url.pathname = "/no-access"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // ── 3. Everything else: pass through ─────────────────────────────────────
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Portal API routes — apply auth header check
    "/api/portal/:path*",
    // Portal page routes — apply revocation cookie check
    "/dashboard/client/:path*",
    "/dashboard/client",
  ],
}
