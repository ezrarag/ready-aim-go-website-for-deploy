import { NextRequest, NextResponse } from "next/server"
import { getAllClientDirectoryEntries, createClientDocument } from "@/lib/firestore"
import { getDefaultModules } from "@/lib/client-directory"

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null
  const collection = "clients"

  try {
    const firebaseClients = await getAllClientDirectoryEntries()

    if (firebaseClients.length === 0) {
      return NextResponse.json({
        success: true,
        source: "firestore-empty",
        clients: [],
        meta: { projectId, collection },
      })
    }

    return NextResponse.json({
      success: true,
      source: "firestore",
      clients: firebaseClients,
      meta: { projectId, collection },
    })
  } catch (error) {
    console.error("Failed to fetch clients directory:", error)
    return NextResponse.json(
      {
        success: false,
        source: "firestore-error",
        clients: [],
        error: error instanceof Error ? error.message : String(error),
        meta: { projectId, collection },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const storyId = typeof body.storyId === "string" ? body.storyId.trim() : ""
    if (!name || !storyId) {
      return NextResponse.json(
        { success: false, error: "name and storyId are required" },
        { status: 400 }
      )
    }
    const modules = body.modules ?? getDefaultModules()
    const id = await createClientDocument({
      name,
      storyId,
      brands: Array.isArray(body.brands) ? body.brands : [],
      status: body.status ?? "onboarding",
      modules,
    })
    return NextResponse.json({ success: true, id })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create client",
      },
      { status: 500 }
    )
  }
}
