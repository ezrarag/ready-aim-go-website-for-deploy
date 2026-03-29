import { type NextRequest, NextResponse } from "next/server"

/** TODO: roles from Firestore */
export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({ roles: [] })
  } catch (error) {
    console.error("Error in roles GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await request.json()
    return NextResponse.json({ error: "Role creation not implemented (use Firestore)" }, { status: 501 })
  } catch (error) {
    console.error("Error in roles POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
