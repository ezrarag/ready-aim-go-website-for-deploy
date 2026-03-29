import { NextRequest, NextResponse } from "next/server"

/** TODO: publish extracted roles via Firestore + auth */
export async function POST(request: NextRequest) {
  try {
    await request.json()
    return NextResponse.json(
      { error: "Role publish not implemented — use Firestore" },
      { status: 501 }
    )
  } catch (error) {
    console.error("Error publishing roles:", error)
    return NextResponse.json({ error: "Failed to publish roles" }, { status: 500 })
  }
}
