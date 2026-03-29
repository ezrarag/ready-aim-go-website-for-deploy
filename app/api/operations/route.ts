import { type NextRequest, NextResponse } from "next/server"

/** TODO: operations CRUD in Firestore + Firebase Auth */
export async function POST(request: NextRequest) {
  try {
    await request.json()
    return NextResponse.json({ error: "Operations API not implemented" }, { status: 501 })
  } catch (error) {
    console.error("Error creating operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({ success: true, operations: [] })
  } catch (error) {
    console.error("Error fetching operations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
