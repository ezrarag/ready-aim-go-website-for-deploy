/**
 * lib/telnyx.ts
 *
 * Telnyx SMS send helper.
 * Used by the intent router to send payment links, confirmations,
 * and replies back to clients via SMS.
 *
 * Usage:
 *   import { sendSMS } from "@/lib/telnyx"
 *   await sendSMS({ to: "+14145550199", text: "Your payment link: https://..." })
 */

const TELNYX_API_BASE = "https://api.telnyx.com/v2"

type SendSMSOptions = {
  to: string        // E.164 format e.g. "+14145550199"
  text: string      // Message body (160 chars per SMS part, auto-splits)
  from?: string     // Override sender number (defaults to TELNYX_PHONE_NUMBER env var)
}

type SendSMSResult = {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendSMS({ to, text, from }: SendSMSOptions): Promise<SendSMSResult> {
  const apiKey = process.env.TELNYX_API_KEY
  const senderNumber = from ?? process.env.TELNYX_PHONE_NUMBER

  if (!apiKey) {
    console.error("[telnyx] TELNYX_API_KEY is not set")
    return { success: false, error: "TELNYX_API_KEY not configured" }
  }

  if (!senderNumber) {
    console.error("[telnyx] TELNYX_PHONE_NUMBER is not set")
    return { success: false, error: "TELNYX_PHONE_NUMBER not configured" }
  }

  try {
    const res = await fetch(`${TELNYX_API_BASE}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: senderNumber,
        to,
        text,
        type: "SMS",
        use_profile_webhooks: true,   // Uses the messaging profile webhook settings
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("[telnyx] Send failed:", data)
      return { success: false, error: data?.errors?.[0]?.detail ?? "Send failed" }
    }

    return {
      success: true,
      messageId: data?.data?.id,
    }
  } catch (err) {
    console.error("[telnyx] Error:", err)
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/**
 * Send a payment link via SMS.
 * Used by the intent router when payment intent is detected.
 */
export async function sendPaymentLinkSMS(to: string, clientName: string, paymentLink: string): Promise<SendSMSResult> {
  const text = `ReadyAimGo: Hi ${clientName} — here's your payment link: ${paymentLink}\n\nReply STOP to opt out.`
  return sendSMS({ to, text })
}

/**
 * Send a scheduling confirmation via SMS.
 */
export async function sendScheduleConfirmationSMS(to: string, clientName: string, details: string): Promise<SendSMSResult> {
  const text = `ReadyAimGo: Hi ${clientName} — ${details}\n\nReply with any questions.`
  return sendSMS({ to, text })
}
