"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatAnswerValue, type Answer, type Question, type QuestionnaireDoc, type QuestionnaireResponse, type QuestionType } from "@/lib/questionnaires"

type DraftQuestion = Question

type DraftQuestionnaire = {
  id: string | null
  title: string
  description: string
  clientLabel: string
  status: "draft" | "active"
  questions: DraftQuestion[]
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short: "Short text",
  long: "Long text",
  choice: "Single choice",
  multi: "Multi-select",
  scale: "Scale",
}

function createDraftQuestion(index: number): DraftQuestion {
  return {
    id: crypto.randomUUID().slice(0, 8),
    order: index + 1,
    type: "short",
    text: "",
    required: true,
    options: null,
    scaleMin: null,
    scaleMax: null,
    scaleLabels: null,
    placeholder: "",
  }
}

function createDraftQuestionnaire(): DraftQuestionnaire {
  return {
    id: null,
    title: "",
    description: "",
    clientLabel: "",
    status: "draft",
    questions: [createDraftQuestion(0)],
  }
}

function statusTone(status: QuestionnaireDoc["status"]) {
  if (status === "closed") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (status === "active") return "bg-sky-500/10 text-sky-700 dark:text-sky-300"
  return "bg-slate-500/10 text-slate-700 dark:text-slate-300"
}

function formatDateTime(value: string | null) {
  if (!value) return "Pending"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function questionToDraft(question: Question): DraftQuestion {
  return {
    ...question,
    options: question.options ? [...question.options] : null,
    scaleLabels: question.scaleLabels ? { ...question.scaleLabels } : null,
  }
}

export function WorkspaceQuestionnairesPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string
  workspaceName: string
}) {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderStep, setBuilderStep] = useState<1 | 2>(1)
  const [draft, setDraft] = useState<DraftQuestionnaire>(createDraftQuestionnaire())
  const [saving, setSaving] = useState(false)
  const [responseViewer, setResponseViewer] = useState<{
    questionnaire: QuestionnaireDoc
    responses: QuestionnaireResponse[]
    loading: boolean
    error: string | null
  } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const sortedQuestionnaires = useMemo(
    () =>
      [...questionnaires].sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime()
        const rightTime = new Date(right.createdAt).getTime()
        return rightTime - leftTime
      }),
    [questionnaires]
  )

  const loadQuestionnaires = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/questionnaires`, {
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Questionnaires returned ${response.status}`)
      }
      setQuestionnaires(Array.isArray(payload.data) ? payload.data : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load questionnaires.")
      setQuestionnaires([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadQuestionnaires()
  }, [workspaceId])

  const openNewBuilder = () => {
    setDraft(createDraftQuestionnaire())
    setBuilderStep(1)
    setBuilderOpen(true)
    setMessage(null)
  }

  const openEditBuilder = (questionnaire: QuestionnaireDoc) => {
    setDraft({
      id: questionnaire.id,
      title: questionnaire.title,
      description: questionnaire.description || "",
      clientLabel: questionnaire.clientLabel || "",
      status: questionnaire.status === "closed" ? "draft" : questionnaire.status,
      questions: questionnaire.questions.map(questionToDraft),
    })
    setBuilderStep(1)
    setBuilderOpen(true)
    setMessage(null)
  }

  const updateQuestion = (questionId: string, patch: Partial<DraftQuestion>) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        question.id === questionId ? { ...question, ...patch, order: index + 1 } : question
      ),
    }))
  }

  const addQuestion = () => {
    setDraft((current) => ({
      ...current,
      questions: [...current.questions, createDraftQuestion(current.questions.length)].map((question, index) => ({
        ...question,
        order: index + 1,
      })),
    }))
  }

  const removeQuestion = (questionId: string) => {
    setDraft((current) => {
      const nextQuestions = current.questions.filter((question) => question.id !== questionId)
      return {
        ...current,
        questions: (nextQuestions.length > 0 ? nextQuestions : [createDraftQuestion(0)]).map((question, index) => ({
          ...question,
          order: index + 1,
        })),
      }
    })
  }

  const saveQuestionnaire = async () => {
    if (!draft.title.trim()) {
      setMessage("Title is required.")
      setBuilderStep(1)
      return
    }
    if (draft.questions.length === 0) {
      setMessage("At least one question is required.")
      setBuilderStep(2)
      return
    }
    if (draft.questions.some((question) => !question.text.trim())) {
      setMessage("Every question needs text before saving.")
      setBuilderStep(2)
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        clientLabel: draft.clientLabel.trim(),
        status: draft.status,
        questions: draft.questions.map((question, index) => ({
          ...question,
          order: index + 1,
          options:
            question.type === "choice" || question.type === "multi"
              ? (question.options ?? []).filter(Boolean)
              : null,
          scaleMin: question.type === "scale" ? question.scaleMin : null,
          scaleMax: question.type === "scale" ? question.scaleMax : null,
          scaleLabels: question.type === "scale" ? question.scaleLabels : null,
          placeholder: question.type === "short" || question.type === "long" ? question.placeholder : null,
        })),
      }

      const response = await fetch(
        draft.id
          ? `/api/workspaces/${encodeURIComponent(workspaceId)}/questionnaires/${encodeURIComponent(draft.id)}`
          : `/api/workspaces/${encodeURIComponent(workspaceId)}/questionnaires`,
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body?.success !== true) {
        throw new Error(body?.error || `Questionnaire save returned ${response.status}`)
      }

      setBuilderOpen(false)
      setDraft(createDraftQuestionnaire())
      setMessage(draft.id ? "Questionnaire updated." : "Questionnaire created.")
      await loadQuestionnaires()
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to save questionnaire.")
    } finally {
      setSaving(false)
    }
  }

  const deleteQuestionnaire = async (questionnaire: QuestionnaireDoc) => {
    if (!window.confirm(`Delete "${questionnaire.title}"?`)) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/questionnaires/${encodeURIComponent(questionnaire.id)}`,
        { method: "DELETE" }
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Questionnaire delete returned ${response.status}`)
      }
      setMessage("Questionnaire deleted.")
      await loadQuestionnaires()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete questionnaire.")
      setLoading(false)
    }
  }

  const openResponses = async (questionnaire: QuestionnaireDoc) => {
    setResponseViewer({
      questionnaire,
      responses: [],
      loading: true,
      error: null,
    })

    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/questionnaires/${encodeURIComponent(questionnaire.id)}/responses`,
        { cache: "no-store" }
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Responses returned ${response.status}`)
      }
      setResponseViewer({
        questionnaire,
        responses: Array.isArray(payload.responses) ? payload.responses : [],
        loading: false,
        error: null,
      })
    } catch (responseError) {
      setResponseViewer({
        questionnaire,
        responses: [],
        loading: false,
        error: responseError instanceof Error ? responseError.message : "Unable to load responses.",
      })
    }
  }

  const exportResponsesAsText = async () => {
    if (!responseViewer || responseViewer.responses.length === 0) return

    const latest = responseViewer.responses[0]
    const lines = [
      responseViewer.questionnaire.title,
      `Submitted: ${formatDateTime(latest.submittedAt)}`,
      "",
      ...latest.answers.flatMap((answer, index) => [
        `Q${index + 1}: ${answer.questionText}`,
        `A: ${formatAnswerValue(answer.value)}`,
        "",
      ]),
    ]

    await navigator.clipboard.writeText(lines.join("\n").trim())
    setMessage("Questionnaire export copied.")
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Questionnaires</p>
          <p className="text-xs text-muted-foreground">
            Build intake forms for {workspaceName}, assign them to this workspace, and review submissions.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openNewBuilder}>
          <Plus className="mr-2 h-4 w-4" />
          New Questionnaire
        </Button>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Title</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Questions</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Completed</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Loading questionnaires...
                </td>
              </tr>
            ) : sortedQuestionnaires.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No questionnaires yet for this workspace.
                </td>
              </tr>
            ) : (
              sortedQuestionnaires.map((questionnaire) => (
                <tr key={questionnaire.id}>
                  <td className="px-3 py-3">
                    <div>
                      <p className="font-medium text-foreground">{questionnaire.title}</p>
                      {questionnaire.clientLabel ? (
                        <p className="text-xs text-muted-foreground">{questionnaire.clientLabel}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={statusTone(questionnaire.status)}>{questionnaire.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{questionnaire.questions.length}</td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDateTime(questionnaire.completedAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEditBuilder(questionnaire)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      {questionnaire.status === "closed" ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => void openResponses(questionnaire)}>
                          View responses
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" onClick={() => void deleteQuestionnaire(questionnaire)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Questionnaire" : "New Questionnaire"}</DialogTitle>
            <DialogDescription>
              Create a client intake form for {workspaceName}. Build the basics first, then define the question flow.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Button type="button" size="sm" variant={builderStep === 1 ? "default" : "outline"} onClick={() => setBuilderStep(1)}>
              Step 1
            </Button>
            <Button type="button" size="sm" variant={builderStep === 2 ? "default" : "outline"} onClick={() => setBuilderStep(2)}>
              Step 2
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {builderStep === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Title</label>
                  <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Client greeting name</label>
                  <Input
                    value={draft.clientLabel}
                    onChange={(event) => setDraft((current) => ({ ...current, clientLabel: event.target.value }))}
                    placeholder="DeTania"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Description</label>
                  <Textarea
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Status</label>
                  <Select value={draft.status} onValueChange={(value: "draft" | "active") => setDraft((current) => ({ ...current, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {draft.questions.map((question, index) => (
                  <div key={question.id} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Question {index + 1}</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => removeQuestion(question.id)}>
                        Delete
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Type</label>
                        <Select
                          value={question.type}
                          onValueChange={(value: QuestionType) =>
                            updateQuestion(question.id, {
                              type: value,
                              options: value === "choice" || value === "multi" ? question.options ?? [""] : null,
                              scaleMin: value === "scale" ? question.scaleMin ?? 1 : null,
                              scaleMax: value === "scale" ? question.scaleMax ?? 10 : null,
                              scaleLabels: value === "scale" ? question.scaleLabels ?? { min: "", max: "" } : null,
                              placeholder: value === "short" || value === "long" ? question.placeholder ?? "" : null,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <Checkbox checked={question.required} onCheckedChange={(checked) => updateQuestion(question.id, { required: checked === true })} />
                        <div>
                          <p className="text-sm font-medium text-foreground">Required</p>
                          <p className="text-xs text-muted-foreground">Clients must answer before they can submit.</p>
                        </div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Question text</label>
                      <Textarea value={question.text} onChange={(event) => updateQuestion(question.id, { text: event.target.value })} rows={3} />
                    </div>

                    {(question.type === "short" || question.type === "long") ? (
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Placeholder</label>
                        <Input
                          value={question.placeholder || ""}
                          onChange={(event) => updateQuestion(question.id, { placeholder: event.target.value })}
                        />
                      </div>
                    ) : null}

                    {(question.type === "choice" || question.type === "multi") ? (
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Options</label>
                        <div className="space-y-2">
                          {(question.options ?? []).map((option, optionIndex) => (
                            <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(event) => {
                                  const nextOptions = [...(question.options ?? [])]
                                  nextOptions[optionIndex] = event.target.value
                                  updateQuestion(question.id, { options: nextOptions })
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const nextOptions = (question.options ?? []).filter((_, indexToKeep) => indexToKeep !== optionIndex)
                                  updateQuestion(question.id, { options: nextOptions.length > 0 ? nextOptions : [""] })
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuestion(question.id, { options: [...(question.options ?? []), ""] })}
                        >
                          Add Option
                        </Button>
                      </div>
                    ) : null}

                    {question.type === "scale" ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Minimum</label>
                          <Input
                            type="number"
                            value={question.scaleMin ?? 1}
                            onChange={(event) => updateQuestion(question.id, { scaleMin: Number(event.target.value || 1) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Maximum</label>
                          <Input
                            type="number"
                            value={question.scaleMax ?? 10}
                            onChange={(event) => updateQuestion(question.id, { scaleMax: Number(event.target.value || 10) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Min label</label>
                          <Input
                            value={question.scaleLabels?.min || ""}
                            onChange={(event) =>
                              updateQuestion(question.id, {
                                scaleLabels: { min: event.target.value, max: question.scaleLabels?.max || "" },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Max label</label>
                          <Input
                            value={question.scaleLabels?.max || ""}
                            onChange={(event) =>
                              updateQuestion(question.id, {
                                scaleLabels: { min: question.scaleLabels?.min || "", max: event.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-4">
            {message ? <p className="mr-auto text-sm text-muted-foreground">{message}</p> : <div className="mr-auto" />}
            {builderStep === 2 ? (
              <Button type="button" variant="outline" onClick={() => setBuilderStep(1)} disabled={saving}>
                Back
              </Button>
            ) : null}
            {builderStep === 1 ? (
              <Button type="button" onClick={() => setBuilderStep(2)} disabled={saving}>
                Next
              </Button>
            ) : (
              <Button type="button" onClick={() => void saveQuestionnaire()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Questionnaire
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(responseViewer)} onOpenChange={(open) => { if (!open) setResponseViewer(null) }}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{responseViewer?.questionnaire.title || "Responses"}</DialogTitle>
            <DialogDescription>
              Review the completed submission and copy it into a Claude or Codex session when needed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            {responseViewer?.loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading responses...</div>
            ) : responseViewer?.error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                {responseViewer.error}
              </div>
            ) : (responseViewer?.responses.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No responses found for this questionnaire.</div>
            ) : (
              (responseViewer?.responses ?? []).map((response) => (
                <div key={response.id} className="space-y-4 rounded-lg border border-border p-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Submitted: {formatDateTime(response.submittedAt)}</p>
                    <p>Submitted by UID: {response.submittedByUid}</p>
                  </div>
                  <div className="space-y-3">
                    {response.answers.map((answer: Answer, index) => (
                      <div key={`${response.id}-${answer.questionId}`} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-foreground">
                          Q{index + 1}: {answer.questionText}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatAnswerValue(answer.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setResponseViewer(null)}>
              Close
            </Button>
            <Button type="button" onClick={() => void exportResponsesAsText()} disabled={!responseViewer || responseViewer.responses.length === 0}>
              <Copy className="mr-2 h-4 w-4" />
              Export as text
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
