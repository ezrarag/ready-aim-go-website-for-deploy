import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { normalizeResponse } from "@/lib/questionnaires"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string; questionnaireId: string }> }

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId, questionnaireId } = await context.params
    const snap = await getAdminDb()
      .collection("workspaces")
      .doc(workspaceId)
      .collection("questionnaires")
      .doc(questionnaireId)
      .collection("responses")
      .orderBy("submittedAt", "desc")
      .get()

    return NextResponse.json({
      success: true,
      responses: snap.docs.map((doc) => normalizeResponse(doc.id, doc.data() as Record<string, unknown>)),
    })
  } catch (error) {
    console.error("GET /api/workspaces/[workspaceId]/questionnaires/[questionnaireId]/responses:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load questionnaire responses." },
      { status: 500 }
    )
  }
}
