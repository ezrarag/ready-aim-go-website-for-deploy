import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientId = params.id

    // Mock client data - in production this would query Supabase
    const mockClient = {
      id: clientId,
      name: "Britney Creative",
      email: "britney@example.com",
      company: "Britney Studios",
      industry: "Music & Entertainment",
      avatar: "/placeholder.svg",
      website: `https://${clientId}.readyaimgo.com`,
      createdAt: new Date("2024-01-01"),
      isActive: true,
      subscription: "pro",
      stats: {
        totalProjects: 32,
        activeOperators: 8,
        completedTasks: 156,
        totalSpent: 45000,
        averageRating: 4.8,
      },
    }

    return NextResponse.json({
      success: true,
      client: mockClient,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch client" }, { status: 500 })
  }
}
