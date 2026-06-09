import { NextRequest, NextResponse } from "next/server"

import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin"
import { sendSMS } from "@/lib/telnyx"

const SUMMARY_SYSTEM_PROMPT =
  "You are summarizing a screen recording of web or app development work. Extract exactly 3 bullet points describing what was built or changed. Be specific and client-friendly. Format as plain text starting with •"

const TRANSCRIPT_SYSTEM_PROMPT =
  "You are transcribing a screen recording of web or app development work. Return only the plain text transcript. Do not summarize."

type ProcessVideoBody = {
  storagePath?: string
  clientSlug?: string
  title?: string
}

function getClaudeText(data: any): string {
  if (!Array.isArray(data?.content)) {
    return ""
  }

  return data.content
    .filter((block: any) => block?.type === "text" && typeof block?.text === "string")
    .map((block: any) => block.text.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim()
}

async function callClaude(system: string, prompt: string, maxTokens: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.")
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Anthropic request failed.")
  }

  return getClaudeText(data)
}

function deriveTitle(inputTitle: string | undefined) {
  if (inputTitle?.trim()) {
    return inputTitle.trim()
  }

  const now = new Date()
  return `${now.toLocaleString("en-US", { month: "long" })} ${now.getDate()} Build Update`
}

function deriveCategory(value: string) {
  const normalized = value.toLowerCase()

  if (normalized.includes("app") || normalized.includes("ios") || normalized.includes("android") || normalized.includes("mobile")) {
    return "app"
  }

  if (normalized.includes("ops") || normalized.includes("automation") || normalized.includes("infra") || normalized.includes("deploy")) {
    return "ops"
  }

  if (normalized.includes("web") || normalized.includes("site") || normalized.includes("page") || normalized.includes("frontend")) {
    return "web"
  }

  return "general"
}

function readPhone(...records: Array<Record<string, unknown>>) {
  const fields = ["phone", "contactPhone", "mobilePhone", "smsPhone"]
  for (const record of records) {
    for (const field of fields) {
      const value = record[field]
      if (typeof value === "string" && value.trim()) return value.trim()
    }

    const fromNumbers = record.whatsappFromNumbers
    if (Array.isArray(fromNumbers)) {
      const value = fromNumbers.find((item): item is string => typeof item === "string" && item.trim().length > 0)
      if (value) return value.trim()
    }
  }
  return ""
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProcessVideoBody
    const storagePath = typeof body.storagePath === "string" ? body.storagePath.trim() : ""
    const clientSlug = typeof body.clientSlug === "string" ? body.clientSlug.trim() : ""
    const title = deriveTitle(body.title)

    if (!storagePath || !clientSlug) {
      return NextResponse.json(
        { success: false, error: "storagePath and clientSlug are required" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const bucket = getAdminStorage()

    const clientSnapshot = await db
      .collection("clients")
      .where("storyId", "==", clientSlug)
      .limit(1)
      .get()

    const clientDoc = clientSnapshot.empty
      ? await db.collection("clients").doc(clientSlug).get()
      : clientSnapshot.docs[0]

    if (!clientDoc.exists) {
      return NextResponse.json(
        { success: false, error: `Client not found for slug ${clientSlug}` },
        { status: 404 }
      )
    }

    const clientId = clientDoc.id
    const clientData = clientDoc.data() ?? {}

    const storageFile = bucket.file(storagePath)
    const [exists] = await storageFile.exists()
    if (!exists) {
      return NextResponse.json(
        { success: false, error: `Storage file not found at ${storagePath}` },
        { status: 404 }
      )
    }

    const [downloadUrl] = await storageFile.getSignedUrl({
      action: "read",
      expires: "2035-01-01",
    })

    const summaryPrompt = [
      `Client slug: ${clientSlug}`,
      `Title: ${title}`,
      `Video URL: ${downloadUrl}`,
      "",
      "Review the screen recording at the URL above and return the requested bullets only.",
    ].join("\n")

    const transcriptPrompt = [
      `Client slug: ${clientSlug}`,
      `Title: ${title}`,
      `Video URL: ${downloadUrl}`,
      "",
      "Review the screen recording at the URL above and return the full plain text transcript only.",
    ].join("\n")

    const aiSummary = await callClaude(SUMMARY_SYSTEM_PROMPT, summaryPrompt, 500)
    let rawTranscript = ""

    try {
      rawTranscript = await callClaude(TRANSCRIPT_SYSTEM_PROMPT, transcriptPrompt, 3000)
    } catch (error) {
      console.error("[videos/process] Transcript extraction failed:", error)
    }

    const category = deriveCategory(`${title} ${storagePath}`)
    const createdAt = new Date().toISOString()

    const videoRef = await db
      .collection("clients")
      .doc(clientId)
      .collection("statusVideos")
      .add({
        title,
        videoUrl: downloadUrl,
        aiSummary,
        rawTranscript,
        category,
        createdAt,
      })

    const clientCommsDoc = await db.collection("clientComms").doc(clientId).get()
    const clientCommsData = clientCommsDoc.data() ?? {}
    const phone = readPhone(clientCommsData, clientData)

    if (phone) {
      const smsResult = await sendSMS({
        to: phone,
        text: `ReadyAimGo: Your ${title} is ready. Watch it here: ${downloadUrl}`,
      })
      if (!smsResult.success) {
        console.warn("[videos/process] SMS notification failed:", smsResult.error)
      }
    }

    return NextResponse.json({
      success: true,
      videoId: videoRef.id,
      aiSummary,
    })
  } catch (error) {
    console.error("[videos/process]", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Video processing failed",
      },
      { status: 500 }
    )
  }
}
