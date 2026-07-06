import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { normalizeQuestionnaire, type Question, type QuestionType } from "@/lib/questionnaires"
import { resolveWorkspaceQuestionnaireAccess } from "@/lib/questionnaire-access"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string }> }

function readString(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function readOptionalString(value: unknown, maxLength = 4000) {
  const normalized = readString(value, maxLength)
  return normalized || null
}

function readQuestionType(value: unknown): QuestionType | null {
  return value === "short" || value === "long" || value === "choice" || value === "multi" || value === "scale"
    ? value
    : null
}

function normalizeQuestionInput(value: unknown, index: number): Question | null {
  const data = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
  const type = readQuestionType(data.type)
  const text = readString(data.text, 2000)
  if (!type || !text) return null

  const options =
    type === "choice" || type === "multi"
      ? Array.isArray(data.options)
        ? data.options.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
        : []
      : []

  const scaleMin = type === "scale" && typeof data.scaleMin === "number" && Number.isFinite(data.scaleMin) ? data.scaleMin : null
  const scaleMax = type === "scale" && typeof data.scaleMax === "number" && Number.isFinite(data.scaleMax) ? data.scaleMax : null

  return {
    id: readString(data.id, 24) || crypto.randomUUID().slice(0, 8),
    order: index + 1,
    type,
    text,
    required: data.required === true,
    options: options.length > 0 ? options : null,
    scaleMin,
    scaleMax,
    scaleLabels:
      type === "scale"
        ? {
            min: readString((data.scaleLabels as Record<string, unknown> | undefined)?.min, 120),
            max: readString((data.scaleLabels as Record<string, unknown> | undefined)?.max, 120),
          }
        : null,
    placeholder: type === "short" || type === "long" ? readOptionalString(data.placeholder, 280) : null,
  }
}

async function canReadQuestionnaires(request: NextRequest, workspaceId: string) {
  if (isInternalReadAuthorized(request)) return true
  const access = await resolveWorkspaceQuestionnaireAccess(request, getAdminDb(), workspaceId)
  return Boolean(access)
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const { workspaceId } = await context.params
    if (!(await canReadQuestionnaires(request, workspaceId))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const db = getAdminDb()
    const snap = await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("questionnaires")
      .orderBy("createdAt", "desc")
      .get()

    return NextResponse.json({
      success: true,
      data: snap.docs.map((doc) => normalizeQuestionnaire(doc.id, doc.data() as Record<string, unknown>)),
    })
  } catch (error) {
    console.error("GET /api/workspaces/[workspaceId]/questionnaires:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to load questionnaires." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const title = readString(body.title, 280)
    const description = readOptionalString(body.description, 4000)
    const clientLabel = readOptionalString(body.clientLabel, 160)
    const status = body.status === "active" ? "active" : "draft"
    const createdByUid = readString(body.createdByUid, 160) || "admin"

    const questions = Array.isArray(body.questions)
      ? body.questions.map((question, index) => normalizeQuestionInput(question, index)).filter((question): question is Question => Boolean(question))
      : []

    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required." }, { status: 400 })
    }
    if (questions.length === 0 || questions.length > 20) {
      return NextResponse.json({ success: false, error: "Questionnaires must have between 1 and 20 questions." }, { status: 400 })
    }

    const db = getAdminDb()
    const ref = db.collection("workspaces").doc(workspaceId).collection("questionnaires").doc()
    await ref.set({
      id: ref.id,
      title,
      description,
      status,
      createdByUid,
      createdAt: FieldValue.serverTimestamp(),
      clientLabel,
      questions,
      completedAt: null,
      completedByUid: null,
    })

    return NextResponse.json({ success: true, id: ref.id })
  } catch (error) {
    console.error("POST /api/workspaces/[workspaceId]/questionnaires:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to create questionnaire." },
      { status: 500 }
    )
  }
}
