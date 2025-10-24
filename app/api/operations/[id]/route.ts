// TODO: Implement Firebase database operations
import { type NextRequest, NextResponse } from "next/server"

// TODO: Implement Firebase database operations
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const operationId = params.id

    // Get user from auth header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Handle different update types
    if (body.action === "claim") {
      const { data: operation, error } = await supabase
        .from("operations")
        .update({
          operator_id: user.id,
          status: "claimed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", operationId)
        .eq("status", "open") // Only allow claiming open operations
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Create notification for client
      await supabase.from("notifications").insert({
        user_id: operation.client_id,
        title: "Operation Claimed",
        description: `Your operation "${operation.title}" has been claimed by an operator`,
        type: "info",
        category: "operations",
        action_url: `/dashboard/client`,
        action_label: "View Dashboard",
      })

      return NextResponse.json({ success: true, operation })
    }

    if (body.action === "complete") {
      const { data: operation, error } = await supabase
        .from("operations")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completion_notes: body.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", operationId)
        .eq("operator_id", user.id) // Only allow operator to complete their own tasks
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Create notification for client
      await supabase.from("notifications").insert({
        user_id: operation.client_id,
        title: "Operation Completed",
        description: `Your operation "${operation.title}" has been completed`,
        type: "success",
        category: "operations",
        action_url: `/dashboard/client`,
        action_label: "View Results",
      })

      return NextResponse.json({ success: true, operation })
    }

    if (body.action === "update_status") {
      const { data: operation, error } = await supabase
        .from("operations")
        .update({
          status: body.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", operationId)
        .eq("operator_id", user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, operation })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const operationId = params.id

    const { data: operation, error } = await supabase
      .from("operations")
      .select(`
        *,
        client:client_id(full_name, avatar_url),
        operator:operator_id(full_name, avatar_url)
      `)
      .eq("id", operationId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, operation })
  } catch (error) {
    console.error("Error fetching operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
