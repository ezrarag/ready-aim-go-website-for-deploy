import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await request.json()
    const { id } = await ctx.params
    return NextResponse.json({ error: "Operation update not implemented", id }, { status: 501 })
  } catch (error) {
    console.error("Error updating operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    return NextResponse.json({ error: "Operation not found", id }, { status: 404 })
  } catch (error) {
    console.error("Error fetching operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
