/**
 * /api/clients/[id]/portal-access
 *
 * GET  — check current portal access status for this client
 * POST — provision portal access (creates ragAllowlist + projects entries)
 * DELETE — revoke portal access (sets allowlist active: false)
 */

import { type NextRequest, NextResponse } from "next/server"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { getClientDirectoryEntryById } from "@/lib/firestore"
import {
  provisionClientPortalAccess,
  revokeClientPortalAccess,
  getClientPortalAccessStatus,
} from "@/lib/provision-client-portal"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getAdminUid(request: NextRequest): string {
  return (
    request.headers.get("x-rag-admin-uid") ??
    request.headers.get("x-admin-uid") ??
    "dashboard-admin"
  ).trim()
}

// ── GET — check access status ─────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await context.params
    const status = await getClientPortalAccessStatus(clientId)
    return NextResponse.json({ success: true, ...status })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to check access" },
      { status: 500 }
    )
  }
}

// ── POST — provision access ───────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: clientId } = await context.params
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      )
    }

    // Load client record to get name
    const client = await getClientDirectoryEntryById(clientId)
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    const result = await provisionClientPortalAccess({
      clientId,
      clientName: client.name,
      email,
      clientSlug: client.storyId,
      deliverables: Array.isArray(body.deliverables) ? body.deliverables : [],
      notes: typeof body.notes === "string" ? body.notes : "",
      addedBy: getAdminUid(request),
    })

    return NextResponse.json({
      success: true,
      result,
      message: result.alreadyExisted.allowlist
        ? `Portal access updated for ${email}`
        : `Portal access granted to ${email} — they can now log into clients.readyaimgo.biz`,
    })
  } catch (error) {
    console.error("[portal-access POST]", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to provision access" },
      { status: 500 }
    )
  }
}

// ── DELETE — revoke access ────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: clientId } = await context.params
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { success: false, error: "Email required to revoke access" },
        { status: 400 }
      )
    }

    await revokeClientPortalAccess(email)

    return NextResponse.json({
      success: true,
      message: `Portal access revoked for ${email}`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to revoke access" },
      { status: 500 }
    )
  }
}
