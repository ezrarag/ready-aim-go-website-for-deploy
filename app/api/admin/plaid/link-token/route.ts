import { type NextRequest, NextResponse } from "next/server"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const clientId = process.env.PLAID_CLIENT_ID
    const secret = process.env.PLAID_SECRET
    const env = process.env.PLAID_ENV || "sandbox" // "sandbox" | "development" | "production"

    if (!clientId || !secret) {
      // Return a mock link token mode for developer setup if credentials aren't set in env
      return NextResponse.json({
        success: true,
        linkToken: "link-sandbox-ready-aim-go-cashapp-token",
        isDemo: true,
        message: "Plaid credentials not yet set in .env.local. Add PLAID_CLIENT_ID & PLAID_SECRET for live Open Banking OAuth.",
      })
    }

    const plaidHost =
      env === "production"
        ? "https://production.plaid.com"
        : env === "development"
        ? "https://development.plaid.com"
        : "https://sandbox.plaid.com"

    const response = await fetch(`${plaidHost}/link/token/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        client_name: "ReadyAimGo Admin Console",
        products: ["transactions"],
        country_codes: ["US"],
        language: "en",
        user: { client_user_id: "admin-ezra-haugabrooks" },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error_message || "Plaid error" }, { status: response.status })
    }

    return NextResponse.json({ success: true, linkToken: data.link_token, isDemo: false })
  } catch (error) {
    console.error("POST /api/admin/plaid/link-token:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create Plaid link token" },
      { status: 500 }
    )
  }
}
