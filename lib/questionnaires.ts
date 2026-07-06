export type QuestionType = "short" | "long" | "choice" | "multi" | "scale"

export type QuestionnaireStatus = "draft" | "active" | "closed"

export interface Question {
  id: string
  order: number
  type: QuestionType
  text: string
  required: boolean
  options: string[] | null
  scaleMin: number | null
  scaleMax: number | null
  scaleLabels: { min: string; max: string } | null
  placeholder: string | null
}

export interface QuestionnaireDoc {
  id: string
  title: string
  description: string | null
  status: QuestionnaireStatus
  createdByUid: string
  createdAt: string
  clientLabel: string | null
  questions: Question[]
  completedAt: string | null
  completedByUid: string | null
}

export interface Answer {
  questionId: string
  questionText: string
  type: QuestionType
  value: string | string[] | number | null
}

export interface QuestionnaireResponse {
  id: string
  questionnaireId: string
  workspaceId: string
  submittedByUid: string
  submittedAt: string
  answers: Answer[]
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function readNullableString(value: unknown) {
  const normalized = readString(value)
  return normalized || null
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readBoolean(value: unknown) {
  return value === true
}

function readQuestionType(value: unknown): QuestionType {
  return value === "short" ||
    value === "long" ||
    value === "choice" ||
    value === "multi" ||
    value === "scale"
    ? value
    : "short"
}

function readQuestionStatus(value: unknown): QuestionnaireStatus {
  return value === "draft" || value === "active" || value === "closed" ? value : "draft"
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

function normalizeQuestion(value: unknown, fallbackOrder: number): Question {
  const data = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
  const type = readQuestionType(data.type)
  const options = Array.isArray(data.options)
    ? data.options.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : null

  return {
    id: readString(data.id) || crypto.randomUUID().slice(0, 8),
    order: readNumber(data.order) ?? fallbackOrder,
    type,
    text: readString(data.text),
    required: readBoolean(data.required),
    options: options && options.length > 0 ? options : null,
    scaleMin: type === "scale" ? readNumber(data.scaleMin) : null,
    scaleMax: type === "scale" ? readNumber(data.scaleMax) : null,
    scaleLabels:
      type === "scale" && data.scaleLabels && typeof data.scaleLabels === "object"
        ? {
            min: readString((data.scaleLabels as Record<string, unknown>).min),
            max: readString((data.scaleLabels as Record<string, unknown>).max),
          }
        : null,
    placeholder: type === "short" || type === "long" ? readNullableString(data.placeholder) : null,
  }
}

function normalizeAnswer(value: unknown): Answer | null {
  const data = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
  const questionId = readString(data.questionId)
  if (!questionId) return null

  const type = readQuestionType(data.type)
  let normalizedValue: string | string[] | number | null = null
  if (typeof data.value === "string") {
    normalizedValue = data.value
  } else if (Array.isArray(data.value)) {
    normalizedValue = data.value.filter((item): item is string => typeof item === "string")
  } else if (typeof data.value === "number" && Number.isFinite(data.value)) {
    normalizedValue = data.value
  }

  return {
    questionId,
    questionText: readString(data.questionText),
    type,
    value: normalizedValue,
  }
}

export function normalizeQuestionnaire(
  id: string,
  data: Record<string, unknown>
): QuestionnaireDoc {
  const questions = Array.isArray(data.questions)
    ? data.questions.map((question, index) => normalizeQuestion(question, index + 1))
    : []

  return {
    id,
    title: readString(data.title),
    description: readNullableString(data.description),
    status: readQuestionStatus(data.status),
    createdByUid: readString(data.createdByUid),
    createdAt: timestampToIso(data.createdAt) || new Date(0).toISOString(),
    clientLabel: readNullableString(data.clientLabel),
    questions,
    completedAt: timestampToIso(data.completedAt),
    completedByUid: readNullableString(data.completedByUid),
  }
}

export function normalizeResponse(
  id: string,
  data: Record<string, unknown>
): QuestionnaireResponse {
  const answers = Array.isArray(data.answers)
    ? data.answers.map((answer) => normalizeAnswer(answer)).filter((answer): answer is Answer => Boolean(answer))
    : []

  return {
    id,
    questionnaireId: readString(data.questionnaireId),
    workspaceId: readString(data.workspaceId),
    submittedByUid: readString(data.submittedByUid),
    submittedAt: timestampToIso(data.submittedAt) || new Date(0).toISOString(),
    answers,
  }
}

export function isCompleted(q: QuestionnaireDoc): boolean {
  return q.completedAt !== null
}

export function isAnswerFilled(value: Answer["value"]): boolean {
  if (typeof value === "number") return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "string") return value.trim().length > 0
  return false
}

export function formatAnswerValue(value: Answer["value"]): string {
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "string") return value
  return "No answer"
}
