import { NextRequest, NextResponse } from "next/server"

/** TODO: contributor projects from Firestore */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email: raw } = await params
    const email = decodeURIComponent(raw)
    return NextResponse.json({
      contributor_email: email,
      projects: [],
      total: 0,
    })
  } catch (error) {
    console.error("Error in contributor projects API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
