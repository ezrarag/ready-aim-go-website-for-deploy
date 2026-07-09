import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import type { ExtractedContractData, ExtractedContractMilestone } from "@/lib/types/contracts"

function readString(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]+/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = readNumber(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeMilestone(value: unknown): ExtractedContractMilestone | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const label = readString(record.label, 280)
  if (!label) return null
  const triggerType = readString(record.triggerType, 40)
  const normalizedTriggerType =
    triggerType === "signing" || triggerType === "delivery" || triggerType === "manual"
      ? triggerType
      : "manual"

  return {
    label,
    amount: readNumber(record.amount),
    triggerType: normalizedTriggerType,
  }
}

function parseClaudeText(payload: any): string {
  if (!Array.isArray(payload?.content)) return ""
  return payload.content
    .filter((item: any) => item?.type === "text" && typeof item?.text === "string")
    .map((item: any) => item.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim()
}

function parseJsonObject(text: string) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error("Claude returned an empty response.")

  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error("Claude did not return valid JSON.")
    }
    return JSON.parse(match[0]) as Record<string, unknown>
  }
}

function inferMimeType(path: string, fallback = "application/octet-stream") {
  const lower = path.toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".gif")) return "image/gif"
  return fallback
}

function normalizeExtractedContract(value: Record<string, unknown>): ExtractedContractData {
  const milestones = Array.isArray(value.milestones)
    ? value.milestones.map((entry) => normalizeMilestone(entry)).filter((entry): entry is ExtractedContractMilestone => Boolean(entry))
    : []

  return {
    payerEntity: readString(value.payerEntity, 280),
    payerContact: readString(value.payerContact, 800),
    contractorName: readString(value.contractorName, 280),
    totalFee: readNumber(value.totalFee),
    currency: readString(value.currency, 24).toLowerCase() || "usd",
    milestones,
    paymentTermsDays: readNullableNumber(value.paymentTermsDays),
    deadlineDate: readString(value.deadlineDate, 80) || null,
  }
}

async function extractContractWithClaude(input: {
  buffer: Buffer
  mimeType: string
  title: string
  storagePath: string
}) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.")
  }

  const base64 = input.buffer.toString("base64")
  const content =
    input.mimeType === "application/pdf"
      ? [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: `Contract title: ${input.title}\nStorage path: ${input.storagePath}\nExtract the requested fields and return strict JSON only.`,
          },
        ]
      : [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: input.mimeType,
              data: base64,
            },
          },
          {
            type: "text",
            text: `Contract title: ${input.title}\nStorage path: ${input.storagePath}\nExtract the requested fields and return strict JSON only.`,
          },
        ]

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      system:
        "You extract billing data from service contracts. Return strict JSON only with this exact shape: {\"payerEntity\": string, \"payerContact\": string, \"contractorName\": string, \"totalFee\": number, \"currency\": string, \"milestones\": [{\"label\": string, \"amount\": number, \"triggerType\": \"signing\" | \"delivery\" | \"manual\"}], \"paymentTermsDays\": number | null, \"deadlineDate\": string | null}. Never include commentary, markdown, or code fences. Use null when unknown, and keep milestone amounts numeric in major currency units.",
      messages: [
        {
          role: "user",
          content,
        },
      ],
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Anthropic extraction failed.")
  }

  return normalizeExtractedContract(parseJsonObject(parseClaudeText(payload)))
}

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    const bucket = getStorageBucket()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })
    if (!bucket) return NextResponse.json({ success: false, error: "Storage unavailable" }, { status: 503 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const storagePath = readString(body.storagePath, 2000)
    const contractId = readString(body.contractId, 240)
    const workspaceId = readString(body.workspaceId, 240) || null
    const clientId = readString(body.clientId, 240) || null
    const title = readString(body.title, 280)

    if (!storagePath) {
      return NextResponse.json({ success: false, error: "storagePath is required." }, { status: 400 })
    }

    const file = bucket.file(storagePath)
    const [exists] = await file.exists()
    if (!exists) {
      return NextResponse.json({ success: false, error: `Storage file not found at ${storagePath}` }, { status: 404 })
    }

    const [metadata] = await file.getMetadata().catch(() => [{} as any])
    const mimeType = inferMimeType(storagePath, typeof metadata?.contentType === "string" ? metadata.contentType : "application/octet-stream")
    if (
      mimeType !== "application/pdf" &&
      mimeType !== "image/png" &&
      mimeType !== "image/jpeg" &&
      mimeType !== "image/webp" &&
      mimeType !== "image/gif"
    ) {
      return NextResponse.json(
        { success: false, error: `Unsupported contract file type: ${mimeType}` },
        { status: 415 }
      )
    }

    const [buffer] = await file.download()
    const extracted = await extractContractWithClaude({
      buffer,
      mimeType,
      title: title || storagePath.split("/").pop() || "Contract",
      storagePath,
    })

    const now = new Date().toISOString()
    const doc = {
      title: title || extracted.payerEntity || storagePath.split("/").pop() || "Extracted contract",
      workspaceId,
      clientId,
      status: "extracted",
      type: "service_contract",
      fileUrl: typeof metadata?.mediaLink === "string" ? metadata.mediaLink : null,
      storagePath,
      payerEntity: extracted.payerEntity,
      payerContact: extracted.payerContact,
      contractorName: extracted.contractorName,
      totalFee: extracted.totalFee,
      currency: extracted.currency,
      milestones: extracted.milestones,
      paymentTermsDays: extracted.paymentTermsDays,
      deadlineDate: extracted.deadlineDate,
      rawExtraction: extracted,
      extractedAt: now,
      updatedAt: now,
      createdAt: now,
      createdByUid: "admin",
      authorSource: "claude_extract",
    }

    if (contractId) {
      const ref = db.collection("contracts").doc(contractId)
      await ref.set(doc, { merge: true })
      return NextResponse.json({ success: true, data: { id: contractId, ...doc } })
    }

    const ref = await db.collection("contracts").add(doc)
    return NextResponse.json({ success: true, data: { id: ref.id, ...doc } }, { status: 201 })
  } catch (error) {
    console.error("POST /api/contracts/extract:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
