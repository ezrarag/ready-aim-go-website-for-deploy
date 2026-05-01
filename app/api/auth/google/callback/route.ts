/**
 * GET /api/auth/google/callback
 *
 * One-time OAuth callback that exchanges the Google auth code for a
 * refresh token and stores it in Firestore at ragConfig/googleOAuth.
 *
 * After this runs once, /api/comms/sync can authenticate automatically
 * without any further manual steps.
 *
 * HOW TO RUN THIS ONE TIME:
 *   1. Visit this URL in your browser while logged in as ezra@readyaimgo.biz:
 *      https://accounts.google.com/o/oauth2/v2/auth?
 *        client_id=YOUR_CLIENT_ID
 *        &redirect_uri=https://readyaimgo.biz/api/auth/google/callback
 *        &response_type=code
 *        &scope=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly
 *        &access_type=offline
 *        &prompt=consent
 *
 *   2. Google redirects to this route with a ?code= param
 *   3. This route exchanges it for tokens and saves to Firestore
 *   4. Done — /api/comms/sync will work from now on automatically
 *
 * SECURITY: This route is admin-only. Add auth guard before deploying.
 */

import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { getFirestoreDb } from "@/lib/firestore"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.json({ error: "No code param in callback" }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? "https://readyaimgo.biz/api/auth/google/callback"

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars required" },
      { status: 500 }
    )
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.refresh_token) {
    return NextResponse.json(
      {
        error:
          "No refresh_token returned. Make sure you passed access_type=offline&prompt=consent in the auth URL.",
      },
      { status: 400 }
    )
  }

  // Store credentials in Firestore — sync route reads from here
  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured for Google OAuth writes." },
      { status: 500 }
    )
  }
  await db.doc("ragConfig/googleOAuth").set(
    {
      clientId,
      clientSecret,
      refreshToken: tokens.refresh_token,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )

  return NextResponse.json({
    ok: true,
    message:
      "Google OAuth connected. Refresh token stored. You can now call POST /api/comms/sync.",
  })
}
