import { type NextRequest, NextResponse } from "next/server"
// TODO: Implement Firebase database operations

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      title,
      description,
      category,
      skills,
      pay_range,
      deadline,
      location,
      tags,
      workstream,
      visibility,
      media_url,
      client_name,
      client_id,
    } = body

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json({ error: "Missing required fields: title, description, category" }, { status: 400 })
    }

    // Insert into beam_roles table
    const { data, error } = await supabaseAdmin
      .from("beam_roles")
      .insert([
        {
          title,
          description,
          category,
          skills: skills || [],
          pay_range,
          deadline,
          location,
          tags: tags || [],
          workstream,
          visibility: visibility || "Public",
          media_url,
          client_name,
          client_id,
          status: "Live",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("✅ Job successfully created in BEAM:", data)

    return NextResponse.json(
      {
        success: true,
        data,
        message: "Job successfully posted to BEAM platform",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
