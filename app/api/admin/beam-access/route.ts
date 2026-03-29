import { NextRequest, NextResponse } from "next/server"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { generateSlug } from "@/lib/beam-access-shared"
import {
  listBeamAllowlistEntries,
  upsertBeamAllowlistEntry,
} from "@/lib/beam-access"

export const dynamic = "force-dynamic"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getAdminUid(request: NextRequest): string {
  const headerValue = request.headers.get("x-rag-admin-uid") ?? request.headers.get("x-admin-uid")
  if (headerValue && headerValue.trim().length > 0) {
    return headerValue.trim()
  }
  return "dashboard-admin"
}

export async function GET(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const entries = await listBeamAllowlistEntries()
    return NextResponse.json({ success: true, entries })
  } catch (error) {
    console.error("Failed to list BEAM access entries:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list BEAM access entries",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const clientName = typeof body.clientName === "string" ? body.clientName.trim() : ""
    const notes = typeof body.notes === "string" ? body.notes : ""
    const requestedSlug = typeof body.clientSlug === "string" ? body.clientSlug.trim() : ""
    const clientSlug = generateSlug(requestedSlug || clientName)

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ success: false, error: "A valid email address is required" }, { status: 400 })
    }

    if (!clientName) {
      return NextResponse.json({ success: false, error: "Client name is required" }, { status: 400 })
    }

    if (!clientSlug) {
      return NextResponse.json({ success: false, error: "Client slug could not be generated" }, { status: 400 })
    }

    const entry = await upsertBeamAllowlistEntry({
      email,
      clientName,
      clientSlug,
      notes,
      addedBy: getAdminUid(request),
    })

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error("Failed to grant BEAM access:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to grant BEAM access",
      },
      { status: 500 }
    )
  }
}
