import { NextResponse } from "next/server"
// TODO: Implement Firebase database operations
import type { Database } from "@/lib/database.types"

// TODO: Implement Firebase database operations
// const supabaseAdmin = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL || "",
//   process.env.SUPABASE_SERVICE_ROLE_KEY || "",
// )

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const roleId = params.id

  if (!roleId) {
    return new NextResponse("Role ID is required", { status: 400 })
  }

  try {
    // Fetch the role from Supabase
    const { data: role, error: roleError } = await supabaseAdmin.from("roles").select("*").eq("id", roleId).single()

    if (roleError) {
      console.error("Error fetching role:", roleError)
      return new NextResponse("Error fetching role", { status: 500 })
    }

    if (!role) {
      return new NextResponse("Role not found", { status: 404 })
    }

    // Fetch the user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", role.clientId)
      .single()

    if (userError) {
      console.error("Error fetching user:", userError)
      return new NextResponse("Error fetching user", { status: 500 })
    }

    // Send to BEAM platform
    const beamResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/beam/create-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: role.title,
        description: role.description,
        category: role.category,
        skills: role.skills,
        pay_range: role.payRange,
        deadline: role.deadline,
        location: role.location,
        workstream: role.workstream,
        visibility: role.visibility,
        tags: role.tags,
        media_url: role.mediaUrl,
        client_name: user?.user_metadata?.full_name || "Unknown Client",
        client_id: role.clientId,
      }),
    })

    if (!beamResponse.ok) {
      const errorData = await beamResponse.json()
      throw new Error(`BEAM API error: ${errorData.error}`)
    }

    const beamResult = await beamResponse.json()
    console.log("✅ Successfully sent to BEAM:", beamResult)

    // Update role status to indicate it's been sent to BEAM
    const { error: updateError } = await supabaseAdmin
      .from("roles")
      .update({
        status: "Live",
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleId)

    if (updateError) {
      console.error("Error updating role status:", updateError)
    }

    return NextResponse.json({
      success: true,
      message: "Role successfully sent to BEAM platform",
      beamData: beamResult.data,
    })
  } catch (error: any) {
    console.error("Error sending to BEAM:", error)
    return new NextResponse(error.message || "Internal Server Error", { status: 500 })
  }
}
