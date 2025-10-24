// TODO: Implement Firebase database operations
import { type NextRequest, NextResponse } from "next/server"

// TODO: Implement Firebase database operations
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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

    // Create operation
    const { data: operation, error } = await supabase
      .from("operations")
      .insert({
        client_id: user.id,
        type: body.type,
        title: body.title,
        description: body.description,
        priority: body.priority || "medium",
        budget: body.budget,
        deadline: body.deadline,
        deliverables: body.deliverables || [],
        tags: body.tags || [],
        requirements: body.requirements || {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create notification for operators
    await supabase.from("notifications").insert({
      user_id: user.id, // This would be sent to relevant operators
      title: "New Operation Available",
      description: `New ${body.type} operation: ${body.title}`,
      type: "info",
      category: "operations",
      action_url: `/operations/${operation.id}`,
      action_label: "View Operation",
    })

    return NextResponse.json({ success: true, operation })
  } catch (error) {
    console.error("Error creating operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const clientId = searchParams.get("clientId")
    const operatorId = searchParams.get("operatorId")

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

    let query = supabase.from("operations").select(`
        *,
        client:client_id(full_name, avatar_url),
        operator:operator_id(full_name, avatar_url)
      `)

    // Apply filters based on user role and params
    if (clientId) {
      query = query.eq("client_id", clientId)
    } else if (operatorId) {
      query = query.eq("operator_id", operatorId)
    } else {
      // Default to user's operations
      const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

      if (userData?.role === "client") {
        query = query.eq("client_id", user.id)
      } else if (userData?.role === "operator") {
        query = query.or(`operator_id.eq.${user.id},status.eq.open`)
      }
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (type) {
      query = query.eq("type", type)
    }

    const { data: operations, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, operations })
  } catch (error) {
    console.error("Error fetching operations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
