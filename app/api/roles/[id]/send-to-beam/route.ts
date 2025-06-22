import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import type { BeamJobPayload } from "@/lib/types/roles"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Fetch the role and client info
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select(`
        *,
        users!roles_client_id_fkey (
          full_name,
          company
        )
      `)
      .eq("id", params.id)
      .single()

    if (roleError || !role) {
      console.error("Error fetching role:", roleError)
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Only send Live roles to BEAM
    if (role.status !== "Live") {
      return NextResponse.json({ error: "Only Live roles can be sent to BEAM" }, { status: 400 })
    }

    // Prepare payload for BEAM
    const beamPayload: BeamJobPayload = {
      title: role.title,
      description: role.description,
      category: role.category,
      skills: role.skills,
      pay: role.pay_range,
      deadline: role.deadline,
      workstream: role.workstream,
      tags: role.tags,
      mediaUrl: role.media_url,
      clientName: role.users?.company || role.users?.full_name || "ReadyAimGo Client",
      location: role.location,
    }

    // Log the request for now (will be actual API call later)
    console.log("🚀 Sending role to BEAM:", {
      roleId: role.id,
      endpoint: "https://beam-platform.com/api/beam/create-job",
      payload: beamPayload,
    })

    // TODO: Replace with actual API call when BEAM endpoint is ready
    // const response = await fetch('https://beam-platform.com/api/beam/create-job', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.BEAM_API_KEY}`
    //   },
    //   body: JSON.stringify(beamPayload)
    // })

    // Simulate successful response for now
    const mockBeamResponse = {
      success: true,
      jobId: `beam_${Date.now()}`,
      message: "Job successfully created on BEAM platform",
    }

    // Update role status to indicate it's been sent to BEAM
    const { error: updateError } = await supabase
      .from("roles")
      .update({
        status: "Live",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)

    if (updateError) {
      console.error("Error updating role status:", updateError)
    }

    return NextResponse.json({
      message: "Role successfully sent to BEAM",
      beamResponse: mockBeamResponse,
      payload: beamPayload,
    })
  } catch (error) {
    console.error("Error sending role to BEAM:", error)
    return NextResponse.json({ error: "Failed to send role to BEAM" }, { status: 500 })
  }
}
