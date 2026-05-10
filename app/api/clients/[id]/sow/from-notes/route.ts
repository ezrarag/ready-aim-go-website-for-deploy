import { type NextRequest, NextResponse } from "next/server"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { getFirestoreDb } from "@/lib/firestore"

interface SOWLineItem {
  description: string
  cost: number
}

interface SOW {
  title: string
  summary: string
  lineItems: SOWLineItem[]
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: clientId } = await context.params
    const body = await request.json().catch(() => ({}))
    const { notes, projectIds, draftTitle } = body as {
      notes?: string
      projectIds?: string[]
      draftTitle?: string
    }

    if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
      return NextResponse.json({ success: false, error: "notes is required" }, { status: 400 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY not configured" },
        { status: 503 }
      )
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system:
          'You are a project scoping assistant. Given raw notes about a client project, extract a Statement of Work. Return JSON only with this shape: { "title": string, "summary": string, "lineItems": Array<{"description": string, "cost": number}> } Costs should be in USD. If cost is not mentioned, use 0.',
        messages: [{ role: "user", content: notes }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return NextResponse.json(
        { success: false, error: `Claude API error: ${claudeRes.status}`, detail: errText },
        { status: 502 }
      )
    }

    const claudeData = (await claudeRes.json()) as {
      content?: Array<{ type: string; text: string }>
    }
    const rawText = claudeData.content?.find((b) => b.type === "text")?.text ?? ""

    let sow: SOW
    try {
      const cleaned = rawText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim()
      sow = JSON.parse(cleaned) as SOW
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse Claude response as JSON", raw: rawText },
        { status: 502 }
      )
    }

    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 503 }
      )
    }

    const ref = db.collection("clients").doc(clientId).collection("sow").doc()
    const now = new Date().toISOString()
    await ref.set({
      title: sow.title,
      summary: sow.summary,
      lineItems: sow.lineItems,
      status: "draft",
      projectIds: projectIds ?? [],
      draftTitle: draftTitle ?? null,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ success: true, sowId: ref.id, sow })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
