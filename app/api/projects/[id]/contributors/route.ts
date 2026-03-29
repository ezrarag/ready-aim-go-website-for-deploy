import { NextRequest, NextResponse } from "next/server"

/** TODO: project contributors from Firestore */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    return NextResponse.json({
      project_id: projectId,
      contributors: [],
      total: 0,
    })
  } catch (error) {
    console.error("Error in project contributors API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
