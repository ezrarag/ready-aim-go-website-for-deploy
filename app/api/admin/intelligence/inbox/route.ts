import { type NextRequest, NextResponse } from "next/server"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { processIncomingEmail, type EmailMessagePayload } from "@/lib/intelligence/inbox-service"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/intelligence/inbox
 * Multi-inbox email forwarder endpoint. Accepts incoming email payloads
 * from support@readyaimgo.biz & haugabr2@uwm.edu forwarders and logs client intelligence.
 */
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<EmailMessagePayload>
    const from = typeof body.from === "string" ? body.from.trim() : ""
    const subject = typeof body.subject === "string" ? body.subject.trim() : ""
    const bodyText = typeof body.bodyText === "string" ? body.bodyText.trim() : ""

    if (!from || !subject) {
      return NextResponse.json({ success: false, error: "from and subject are required." }, { status: 400 })
    }

    const result = await processIncomingEmail({
      from,
      to: body.to || "support@readyaimgo.biz",
      subject,
      bodyText: bodyText || subject,
      receivedAt: body.receivedAt || new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Email intelligence successfully processed and linked to client workspace.",
      data: result,
    })
  } catch (error) {
    console.error("POST /api/admin/intelligence/inbox error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process email intelligence." },
      { status: 500 }
    )
  }
}
