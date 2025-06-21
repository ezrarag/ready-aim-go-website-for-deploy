import { type NextRequest, NextResponse } from "next/server"
import type { Operation } from "@/lib/types/platform"

// Mock database - in production this would be replaced with Supabase
const operations: Operation[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const operation: Operation = {
      id: crypto.randomUUID(),
      clientId: body.clientId,
      operatorId: body.operatorId || null,
      type: body.type,
      title: body.title,
      description: body.description,
      status: body.status || "open",
      priority: body.priority || "medium",
      budget: body.budget,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      deliverables: body.deliverables || [],
      attachments: body.attachments || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    operations.push(operation)

    return NextResponse.json({
      success: true,
      operation,
      message: "Operation created successfully",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create operation" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const clientId = searchParams.get("clientId")
    const operatorId = searchParams.get("operatorId")

    let filteredOps = operations

    if (status) {
      filteredOps = filteredOps.filter((op) => op.status === status)
    }

    if (clientId) {
      filteredOps = filteredOps.filter((op) => op.clientId === clientId)
    }

    if (operatorId) {
      filteredOps = filteredOps.filter((op) => op.operatorId === operatorId)
    }

    return NextResponse.json({
      success: true,
      operations: filteredOps,
      count: filteredOps.length,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch operations" }, { status: 500 })
  }
}
