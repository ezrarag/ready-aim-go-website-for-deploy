import { NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { decodeRouteParam } from "@/lib/route-params"
import { resolveClientDocumentId } from "@/lib/firestore"

function readIdeaText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 2000) : ""
}

async function resolveIdeasCollection(clientRef: string) {
  const resolvedClientId = await resolveClientDocumentId(clientRef)
  if (!resolvedClientId) {
    return null
  }

  const db = getAdminDb()
  return db.collection("clients").doc(resolvedClientId).collection("ideas")
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const params = await context.params
    const clientId = decodeRouteParam(params.id)
    const ideasRef = await resolveIdeasCollection(clientId)

    if (!ideasRef) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const snapshot = await ideasRef.get()
    return NextResponse.json({ success: true, count: snapshot.size })
  } catch (error) {
    console.error("GET /api/desktop/clients/[id]/ideas:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch ideas",
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const params = await context.params
    const clientId = decodeRouteParam(params.id)
    const ideasRef = await resolveIdeasCollection(clientId)

    if (!ideasRef) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const body = await request.json()
    const text = readIdeaText(body.text)

    if (!text) {
      return NextResponse.json({ success: false, error: "text is required" }, { status: 400 })
    }

    const capturedAt = new Date().toISOString()
    const ref = ideasRef.doc()

    await ref.set({
      text,
      capturedAt,
      status: "unprocessed",
    })

    return NextResponse.json({ success: true, id: ref.id, capturedAt })
  } catch (error) {
    console.error("POST /api/desktop/clients/[id]/ideas:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create idea",
      },
      { status: 500 }
    )
  }
}
