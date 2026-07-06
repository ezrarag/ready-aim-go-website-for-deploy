import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import type { Question, QuestionType, QuestionnaireStatus } from "@/lib/questionnaires"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string; questionnaireId: string }> }

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

function readStatus(value: unknown): QuestionnaireStatus | null {
  return value === "draft" || value === "active" || value === "closed" ? value : null
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

  return {
    id: readString(data.id, 24) || crypto.randomUUID().slice(0, 8),
    order: index + 1,
    type,
    text,
    required: data.required === true,
    options: options.length > 0 ? options : null,
    scaleMin: type === "scale" && typeof data.scaleMin === "number" ? data.scaleMin : null,
    scaleMax: type === "scale" && typeof data.scaleMax === "number" ? data.scaleMax : null,
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

export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId, questionnaireId } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const patch: Record<string, unknown> = {}

    if ("title" in body) patch.title = readString(body.title, 280)
    if ("description" in body) patch.description = readOptionalString(body.description, 4000)
    if ("clientLabel" in body) patch.clientLabel = readOptionalString(body.clientLabel, 160)
    if ("status" in body) {
      const status = readStatus(body.status)
      if (!status) {
        return NextResponse.json({ success: false, error: "Invalid questionnaire status." }, { status: 400 })
      }
      patch.status = status
    }
    if ("questions" in body) {
      const questions = Array.isArray(body.questions)
        ? body.questions.map((question, index) => normalizeQuestionInput(question, index)).filter((question): question is Question => Boolean(question))
        : []
      if (questions.length === 0 || questions.length > 20) {
        return NextResponse.json({ success: false, error: "Questionnaires must have between 1 and 20 questions." }, { status: 400 })
      }
      patch.questions = questions
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: "No supported fields provided." }, { status: 400 })
    }

    const db = getAdminDb()
    await db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("questionnaires")
      .doc(questionnaireId)
      .set(patch, { merge: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/workspaces/[workspaceId]/questionnaires/[questionnaireId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to update questionnaire." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId, questionnaireId } = await context.params
    await getAdminDb()
      .collection("workspaces")
      .doc(workspaceId)
      .collection("questionnaires")
      .doc(questionnaireId)
      .delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/workspaces/[workspaceId]/questionnaires/[questionnaireId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to delete questionnaire." },
      { status: 500 }
    )
  }
}
