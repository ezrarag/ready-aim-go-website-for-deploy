import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const workstream = searchParams.get("workstream")

    let query = supabase.from("roles").select("*").order("created_at", { ascending: false })

    if (clientId) {
      query = query.eq("client_id", clientId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (category) {
      query = query.eq("category", category)
    }

    if (workstream) {
      query = query.eq("workstream", workstream)
    }

    const { data: roles, error } = await query

    if (error) {
      console.error("Error fetching roles:", error)
      return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 })
    }

    return NextResponse.json({ roles })
  } catch (error) {
    console.error("Error in roles GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
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
      .insert({
        client_id: clientId,
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
      .select()
      .single()

    if (error) {
      console.error("Error creating role:", error)
      return NextResponse.json({ error: "Failed to create role" }, { status: 500 })
    }

    return NextResponse.json({ role }, { status: 201 })
  } catch (error) {
    console.error("Error in roles POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
