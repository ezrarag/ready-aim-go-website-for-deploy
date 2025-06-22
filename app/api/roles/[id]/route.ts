import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: role, error } = await supabase.from("roles").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Error fetching role:", error)
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error("Error in role GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      category,
      skills,
      payRange,
      deadline,
      location,
      workstream,
      visibility,
      tags,
      mediaUrl,
      status,
    } = body

    const { data: role, error } = await supabase
      .from("roles")
      .update({
        title,
        description,
        category,
        skills,
        pay_range: payRange,
        deadline,
        location,
        workstream,
        visibility,
        tags,
        media_url: mediaUrl,
        status,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating role:", error)
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error("Error in role PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from("roles").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting role:", error)
      return NextResponse.json({ error: "Failed to delete role" }, { status: 500 })
    }

    return NextResponse.json({ message: "Role deleted successfully" })
  } catch (error) {
    console.error("Error in role DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
