/**
 * GET /api/auth/outlook/callback
 *
 * One-time OAuth callback for Microsoft Graph (Outlook + Calendar).
 * Exchanges auth code for refresh token and stores in Firestore.
 *
 * HOW TO RUN THIS ONE TIME:
 *   Open this URL in your browser while signed into your Microsoft account:
 *
 *   https://login.microsoftonline.com/common/oauth2/v2.0/authorize
 *     ?client_id=YOUR_OUTLOOK_CLIENT_ID
 *     &response_type=code
 *     &redirect_uri=https://readyaimgo.biz/api/auth/outlook/callback
 *     &scope=Mail.Read Calendars.Read offline_access
 *     &response_mode=query
 *
 *   Microsoft redirects back here with ?code=...
 *   This route exchanges it for tokens and saves to ragConfig/outlookOAuth.
 *   Done — /api/comms/outlook/sync will work automatically from now on.
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.json({ error: `Microsoft OAuth error: ${error}` }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: "No code param in callback" }, { status: 400 })
  }

  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const tenantId = process.env.OUTLOOK_TENANT_ID ?? "common"
  const redirectUri =
    process.env.OUTLOOK_REDIRECT_URI ??
    "https://readyaimgo.biz/api/auth/outlook/callback"

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET env vars required" },
      { status: 500 }
    )
  }

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "Mail.Read Calendars.Read offline_access",
      }),
    }
  )

  const tokenData = await tokenRes.json()

  if (!tokenData.refresh_token) {
    return NextResponse.json(
      {
        error: "No refresh_token returned.",
        detail: tokenData,
      },
      { status: 400 }
    )
  }

  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured for Outlook OAuth writes." },
      { status: 500 }
    )
  }
  await db.doc("ragConfig/outlookOAuth").set(
    {
      clientId,
      clientSecret,
      tenantId,
      refreshToken: tokenData.refresh_token,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )

  return NextResponse.json({
    ok: true,
    message:
      "Outlook OAuth connected. Refresh token stored. You can now call POST /api/comms/outlook/sync.",
  })
}
