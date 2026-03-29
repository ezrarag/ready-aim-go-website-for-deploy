import { type NextRequest, NextResponse } from "next/server"
import { getClientDirectoryEntryById, getFirestoreDb } from "@/lib/firestore"
import { clientRoleSuggestionSnapshotSchema } from "@/lib/client-role-suggestions"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; suggestionId: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, suggestionId } = await context.params
    const client = await getClientDirectoryEntryById(id)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    if (!client.roleSuggestionSnapshot) {
      return NextResponse.json({ success: false, error: "No role suggestion snapshot found" }, { status: 404 })
    }

    const body = await request.json()
    const nextStatus = body?.status
    if (!["suggested", "shortlisted", "approved", "rejected"].includes(nextStatus)) {
      return NextResponse.json({ success: false, error: "Invalid role suggestion status" }, { status: 400 })
    }

    const snapshot = clientRoleSuggestionSnapshotSchema.parse(client.roleSuggestionSnapshot)
    const nextSuggestions = snapshot.roleSuggestions.map((suggestion) =>
      suggestion.id === suggestionId ? { ...suggestion, status: nextStatus } : suggestion
    )

    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Firebase not initialized" }, { status: 503 })
    }

    const nextSnapshot = {
      ...snapshot,
      roleSuggestions: nextSuggestions,
      generatedAt: new Date().toISOString(),
    }

    await db.collection("clients").doc(client.id).update({
      roleSuggestionSnapshot: clientRoleSuggestionSnapshotSchema.parse(nextSnapshot),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      roleSuggestionSnapshot: nextSnapshot,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update role suggestion",
      },
      { status: 500 }
    )
  }
}
