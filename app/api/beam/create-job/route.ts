import { type NextRequest, NextResponse } from "next/server"

/** TODO: persist BEAM job to Firestore */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, category } = body
    if (!title || !description || !category) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, category" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "BEAM job create not implemented (Firestore migration pending)" },
      { status: 501 }
    )
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
