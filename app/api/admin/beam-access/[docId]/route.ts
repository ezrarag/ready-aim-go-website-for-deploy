import { NextRequest, NextResponse } from "next/server"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { setBeamAllowlistEntryActive } from "@/lib/beam-access"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { docId } = await params
    const body = await request.json()

    if (typeof body.active !== "boolean") {
      return NextResponse.json({ success: false, error: "active must be a boolean" }, { status: 400 })
    }

    const entry = await setBeamAllowlistEntryActive(docId, body.active)
    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error("Failed to update BEAM access entry:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update BEAM access entry",
      },
      { status: 500 }
    )
  }
}
