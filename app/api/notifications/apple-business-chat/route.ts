import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { businessChatId, message, metadata } = await request.json()

    // Apple Business Chat API integration
    const appleBusinessChatPayload = {
      businessId: process.env.APPLE_BUSINESS_ID,
      recipient: businessChatId,
      message: {
        type: "text",
        text: message,
      },
      metadata: metadata || {},
    }

    // In production, this would call Apple's Business Chat API
    const response = await fetch("https://api.business.apple.com/message/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.APPLE_BUSINESS_CHAT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appleBusinessChatPayload),
    })

    if (!response.ok) {
      throw new Error(`Apple Business Chat API error: ${response.statusText}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      deliveredAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Apple Business Chat API error:", error)
    return NextResponse.json({ error: "Failed to send Apple Business Chat message" }, { status: 500 })
  }
}
