import { type NextRequest, NextResponse } from "next/server"

/** TODO: list BEAM jobs from Firestore */
export async function GET(_req: NextRequest) {
  try {
    return NextResponse.json({ success: true, data: [], count: 0 }, { status: 200 })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
