import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase/admin"
import { isAnswerFilled, normalizeQuestionnaire, type Answer } from "@/lib/questionnaires"
import { resolveWorkspaceQuestionnaireAccess } from "@/lib/questionnaire-access"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string; questionnaireId: string }> }

function readString(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function normalizeAnswerInput(value: unknown): Answer | null {
  const data = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
  const questionId = readString(data.questionId, 120)
  const questionText = readString(data.questionText, 2000)
  const type =
    data.type === "short" ||
    data.type === "long" ||
    data.type === "choice" ||
    data.type === "multi" ||
    data.type === "scale"
      ? data.type
      : null

  if (!questionId || !type) return null

  let normalizedValue: string | string[] | number | null = null
  if (typeof data.value === "string") {
    normalizedValue = data.value.trim()
  } else if (Array.isArray(data.value)) {
    normalizedValue = data.value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
  } else if (typeof data.value === "number" && Number.isFinite(data.value)) {
    normalizedValue = data.value
  }

  return {
    questionId,
    questionText,
    type,
    value: normalizedValue,
  }
}

async function sendSlackWebhook(payload: {
  clientLabel: string
  workspaceName: string
  questionnaireTitle: string
  answerCount: number
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim()
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text:
        `📋 *Questionnaire Completed*\n` +
        `*Client:* ${payload.clientLabel}\n` +
        `*Workspace:* ${payload.workspaceName}\n` +
        `*Form:* ${payload.questionnaireTitle}\n` +
        `*Answers:* ${payload.answerCount} responses submitted\n` +
        `_Open admin panel to view responses._`,
    }),
  }).catch((error) => {
    console.error("Questionnaire Slack notify failed:", error)
  })
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const { workspaceId, questionnaireId } = await context.params
    const db = getAdminDb()
    const access = await resolveWorkspaceQuestionnaireAccess(request, db, workspaceId)
    if (!access) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const questionnaireRef = db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("questionnaires")
      .doc(questionnaireId)
    const questionnaireSnap = await questionnaireRef.get()

    if (!questionnaireSnap.exists) {
      return NextResponse.json({ success: false, error: "Questionnaire not found." }, { status: 404 })
    }

    const questionnaire = normalizeQuestionnaire(
      questionnaireSnap.id,
      questionnaireSnap.data() as Record<string, unknown>
    )

    if (questionnaire.status !== "active" || questionnaire.completedAt) {
      return NextResponse.json({ success: false, error: "This questionnaire is no longer accepting responses." }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const answers = Array.isArray(body.answers)
      ? body.answers.map((answer) => normalizeAnswerInput(answer)).filter((answer): answer is Answer => Boolean(answer))
      : []

    const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]))
    for (const question of questionnaire.questions) {
      const answer = answersByQuestionId.get(question.id)
      if (question.required && !isAnswerFilled(answer?.value ?? null)) {
        return NextResponse.json(
          { success: false, error: `Required question missing: ${question.text}` },
          { status: 400 }
        )
      }
    }

    const responseRef = questionnaireRef.collection("responses").doc()
    const snapshotAnswers = questionnaire.questions.map((question) => {
      const answer = answersByQuestionId.get(question.id)
      return {
        questionId: question.id,
        questionText: question.text,
        type: question.type,
        value: answer?.value ?? null,
      }
    })

    await responseRef.set({
      id: responseRef.id,
      questionnaireId,
      workspaceId,
      submittedByUid: access.identity.uid,
      submittedAt: FieldValue.serverTimestamp(),
      answers: snapshotAnswers,
    })

    await questionnaireRef.set(
      {
        completedAt: FieldValue.serverTimestamp(),
        completedByUid: access.identity.uid,
        status: "closed",
      },
      { merge: true }
    )

    const workspaceName =
      typeof access.workspaceData.name === "string" && access.workspaceData.name.trim()
        ? access.workspaceData.name.trim()
        : workspaceId
    const clientLabel = questionnaire.clientLabel || workspaceName

    await sendSlackWebhook({
      clientLabel,
      workspaceName,
      questionnaireTitle: questionnaire.title,
      answerCount: snapshotAnswers.length,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/workspaces/[workspaceId]/questionnaires/[questionnaireId]/submit:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to submit questionnaire." },
      { status: 500 }
    )
  }
}
