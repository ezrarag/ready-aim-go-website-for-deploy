"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { portalFetch, PortalAuthError } from "@/lib/portal-client"
import { type QuestionnaireDoc } from "@/lib/questionnaires"

type AnswerState = Record<string, string | string[] | number | null>

function isFilled(value: string | string[] | number | null | undefined) {
  if (typeof value === "number") return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "string") return value.trim().length > 0
  return false
}

export function ClientQuestionnairesCard({
  workspaceId,
  clientName,
}: {
  workspaceId: string | null | undefined
  clientName: string | null | undefined
}) {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeQuestionnaire, setActiveQuestionnaire] = useState<QuestionnaireDoc | null>(null)
  const [answers, setAnswers] = useState<AnswerState>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const activeItems = useMemo(
    () => questionnaires.filter((questionnaire) => questionnaire.status === "active" && !questionnaire.completedAt),
    [questionnaires]
  )

  const loadQuestionnaires = async () => {
    if (!workspaceId) {
      setQuestionnaires([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await portalFetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/questionnaires`, {
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Questionnaires returned ${response.status}`)
      }
      setQuestionnaires(Array.isArray(payload.data) ? payload.data : [])
    } catch (loadError) {
      if (loadError instanceof PortalAuthError) {
        setError("Your session is no longer authorized for this workspace.")
      } else {
        setError(loadError instanceof Error ? loadError.message : "Unable to load questionnaires.")
      }
      setQuestionnaires([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadQuestionnaires()
  }, [workspaceId])

  const openQuestionnaire = (questionnaire: QuestionnaireDoc) => {
    const nextAnswers: AnswerState = {}
    for (const question of questionnaire.questions) {
      nextAnswers[question.id] = question.type === "multi" ? [] : null
    }
    setAnswers(nextAnswers)
    setActiveQuestionnaire(questionnaire)
    setMessage(null)
  }

  const submitQuestionnaire = async () => {
    if (!workspaceId || !activeQuestionnaire) return

    for (const question of activeQuestionnaire.questions) {
      if (question.required && !isFilled(answers[question.id])) {
        setMessage(`Please answer: ${question.text}`)
        return
      }
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const response = await portalFetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/questionnaires/${encodeURIComponent(activeQuestionnaire.id)}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            answers: activeQuestionnaire.questions.map((question) => ({
              questionId: question.id,
              questionText: question.text,
              type: question.type,
              value: answers[question.id] ?? null,
            })),
          }),
        }
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || `Questionnaire submit returned ${response.status}`)
      }

      setActiveQuestionnaire(null)
      setAnswers({})
      setMessage("Questionnaire submitted.")
      await loadQuestionnaires()
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "Unable to submit questionnaire.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Card className="bg-neutral-800 border-gray-200 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">QUESTIONNAIRES</CardTitle>
          <CardDescription className="text-neutral-400">
            Active intake forms for {clientName || "this workspace"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {message ? (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-neutral-400">Loading questionnaires...</div>
          ) : error ? (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
          ) : activeItems.length === 0 ? (
            <div className="text-sm text-neutral-400">No active questionnaires are assigned to this workspace right now.</div>
          ) : (
            activeItems.map((questionnaire) => (
              <div key={questionnaire.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{questionnaire.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {questionnaire.questions.length} question{questionnaire.questions.length === 1 ? "" : "s"}
                    </p>
                    {questionnaire.description ? (
                      <p className="mt-2 text-sm text-neutral-300">{questionnaire.description}</p>
                    ) : null}
                  </div>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => openQuestionnaire(questionnaire)}>
                    Open
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(activeQuestionnaire)} onOpenChange={(open) => { if (!open) setActiveQuestionnaire(null) }}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle>{activeQuestionnaire?.title || "Questionnaire"}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {activeQuestionnaire?.description || "Complete the intake form and submit it once you are done."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {activeQuestionnaire?.questions.map((question, index) => (
              <div key={question.id} className="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
                <p className="text-sm font-semibold text-white">
                  {index + 1}. {question.text}
                  {question.required ? <span className="ml-2 text-xs uppercase text-orange-400">Required</span> : null}
                </p>

                {question.type === "short" ? (
                  <Input
                    className="mt-3 bg-neutral-900 border-neutral-700 text-white"
                    value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                    onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                    placeholder={question.placeholder || ""}
                  />
                ) : null}

                {question.type === "long" ? (
                  <Textarea
                    className="mt-3 bg-neutral-900 border-neutral-700 text-white"
                    value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                    onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                    placeholder={question.placeholder || ""}
                    rows={5}
                  />
                ) : null}

                {question.type === "choice" ? (
                  <div className="mt-3 space-y-2">
                    {(question.options ?? []).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                        className={
                          answers[question.id] === option
                            ? "block w-full rounded border border-orange-500 bg-orange-500/10 px-3 py-2 text-left text-sm text-orange-200"
                            : "block w-full rounded border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-300"
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}

                {question.type === "multi" ? (
                  <div className="mt-3 space-y-2">
                    {(question.options ?? []).map((option) => {
                      const current = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : []
                      const checked = current.includes(option)
                      return (
                        <label key={option} className="flex items-center gap-3 rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setAnswers((state) => {
                                const value = Array.isArray(state[question.id]) ? ([...(state[question.id] as string[])] as string[]) : []
                                return {
                                  ...state,
                                  [question.id]: next === true ? [...value, option] : value.filter((item) => item !== option),
                                }
                              })
                            }
                          />
                          <span>{option}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : null}

                {question.type === "scale" ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>{question.scaleLabels?.min || question.scaleMin || "Low"}</span>
                      <span>{question.scaleLabels?.max || question.scaleMax || "High"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        { length: Math.max(0, (question.scaleMax ?? 10) - (question.scaleMin ?? 1) + 1) },
                        (_, offset) => (question.scaleMin ?? 1) + offset
                      ).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAnswers((current) => ({ ...current, [question.id]: value }))}
                          className={
                            answers[question.id] === value
                              ? "rounded border border-orange-500 bg-orange-500/10 px-3 py-2 text-sm text-orange-200"
                              : "rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300"
                          }
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-neutral-800 pt-4">
            {message ? <p className="mr-auto text-sm text-neutral-400">{message}</p> : <div className="mr-auto" />}
            <Button type="button" variant="outline" onClick={() => setActiveQuestionnaire(null)}>
              Close
            </Button>
            <Button type="button" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => void submitQuestionnaire()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
