# RAG Platform — Master Setup Guide
# Updated: May 2026
# Covers: readyaimgo.biz, clients.readyaimgo.biz, communications hub, iOS apps, BEAM subdomains

---

## FIRST: Fix the Login Error

If you cannot log into readyaimgo.biz/dashboard, work through this checklist in order.
Every step is required for a fresh Firebase project.

### Step 1 — Enable Google Auth in Firebase
1. Firebase Console → your project → Authentication → Sign-in method
2. Click Google → Enable → add ezra@readyaimgo.biz as support email → Save
3. Also enable Email/Password for client portal logins

### Step 2 — Create your admin user document
The dashboard checks Firestore for a users/{uid} document with role: "admin".
Without it, login succeeds then immediately signs you out.

1. Go to readyaimgo.biz/login → click "Sign in with Google"
2. It will fail — but Firebase creates your auth user
3. Firebase Console → Authentication → Users tab → copy your UID
4. Firebase Console → Firestore → Create collection: users
5. Create document with ID = your UID, add these fields:
   - role (string): admin
   - email (string): ezra@readyaimgo.biz
   - full_name (string): Ezra Hauga
6. Try logging in again — it should work now

### Step 3 — Set Firestore security rules
Firebase Console → Firestore → Rules → paste this → Publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth.uid == uid;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 4 — Verify all NEXT_PUBLIC_FIREBASE_ env vars are set
Firebase Console → Project Settings → Your Apps → Web App → copy all values into .env.local
Required:
- NEXT_PUBLIC_FIREBASE_API_KEY (starts with AIza)
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN (format: project-id.firebaseapp.com)
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

Restart npm run dev after editing .env.local — Next.js does not hot-reload env vars.

---

## Account Setup — Which Email to Use

Use ezra@readyaimgo.biz for all business infrastructure:
- Anthropic API (console.anthropic.com)
- Firebase
- Vercel
- Stripe
- Google Cloud OAuth
- Apple Developer
- GitHub

Use ezra@beamthinktank.org only for BEAM-specific tools, grants, and nonprofit reporting.
Keep these billing identities separate for clean accounting and investor due diligence.

---

## 1. Firebase (Required — do this first)

Cost: Free (Spark plan covers RAG volume)
Upgrade to Blaze only if you need Cloud Functions or exceed free tier

### Client-side env vars (public)
Get from: Firebase Console → Project Settings → Your Apps → Web App config

NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

### Server-side env vars (Admin SDK — never expose publicly)
Get from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key

Option A (recommended): paste the entire JSON as one line
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

Option B: individual fields
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
Note: In Vercel, escape newlines as \n. In .env.local, use actual newlines inside quotes.

### Finding your client IDs
Client IDs = Firestore document IDs in the clients collection. Three ways to find them:
1. Firebase Console → Firestore → clients collection → left column shows document IDs
2. readyaimgo.biz/dashboard/clients → each card URL contains the ID
3. GET /api/clients returns all clients with their IDs

---

## 2. Anthropic API (Required for AI features)

Cost: Pay-as-you-go. No monthly minimum. Typical RAG usage: $5-15/month
No separate "developer account" needed — same account as claude.ai but billed separately

### Setup
1. Go to console.anthropic.com
2. Sign in or create account with ezra@readyaimgo.biz
3. API Keys → Create Key → name it "RAG Production"
4. Copy the key immediately — only shown once
5. Billing → add payment method → set auto-recharge OFF initially
6. Start with a $20 manual top-up to test real usage

ANTHROPIC_API_KEY=sk-ant-api03-...

### Used for
- /api/comms/intent — classifies all incoming messages (Gmail, Outlook, WhatsApp, iMessage)
- /api/comms/extract-events — extracts scheduling info from messages
- /api/comms/compose-reply — drafts replies in Ezra's voice
- /api/build-tracker — generates Claude prompts per project
- clients.readyaimgo.biz — AI-interpreted client feedback

---

## 3. Google Cloud OAuth (Gmail + Calendar)

Cost: Free

### Setup
1. console.cloud.google.com → select your existing project
2. APIs & Services → Library → enable Gmail API
3. APIs & Services → Library → enable Google Calendar API
4. APIs & Services → OAuth consent screen → add scopes:
   - https://www.googleapis.com/auth/gmail.readonly
   - https://www.googleapis.com/auth/calendar.readonly
5. Credentials → Create Credentials → OAuth 2.0 Client ID → Web application
6. Authorized redirect URIs: https://readyaimgo.biz/api/auth/google/callback
7. Copy Client ID and Client Secret

GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://readyaimgo.biz/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=  ← populated after one-time OAuth flow below

### One-time OAuth flow (run once after deploying env vars)
Visit this URL in Chrome while signed into ezra@readyaimgo.biz:

https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://readyaimgo.biz/api/auth/google/callback
  &response_type=code
  &scope=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly
  &access_type=offline
  &prompt=consent

This stores a refresh token in Firestore at ragConfig/googleOAuth.
After this, /api/comms/sync and /api/pulse/calendar work automatically.

Note: The pulse routes (already in codebase) use GOOGLE_REFRESH_TOKEN env var directly.
The new comms sync routes use the Firestore token. Both need to be set.

---

## 4. UWM Calendar (Free — ICS URL method)

Cost: Free. No API, no IT approval needed.

### Getting the ICS URL (takes 2 minutes)
1. Go to outlook.office365.com → sign in with haugabr2@uwm.edu
2. Click the calendar icon → top right gear → View all Outlook settings
3. Calendar → Shared calendars → Publish a calendar
4. Select your calendar → Can view all details → Publish
5. Copy the ICS link (not the HTML link)

UWM_CALENDAR_ICS_URL=https://outlook.office365.com/owa/calendar/...

Add this to both .env.local (for local dev) and Vercel (for production).

### What this does
UWM class schedules, appointments, and events appear in the Command Center
at /dashboard/command alongside your RAG client meetings.
The segment classifier automatically tags UWM events as "personal" unless
they contain keywords like "client", "beam", etc.

### For UWM emails
UWM IT blocks direct OAuth access. Workaround: forward UWM email to Gmail.
1. Outlook Web → Settings → Mail → Forwarding
2. Enable forwarding to ezra@readyaimgo.biz
3. Gmail sync catches forwarded UWM emails on next hourly run

---

## 5. Microsoft Azure (Outlook sync)

Cost: Free tier

### UWM account caveat
UWM uses Microsoft 365 for Education. IT may block OAuth consent.
Recommendation: set up with a personal Microsoft account first to verify
the integration works, then pursue UWM IT approval separately.

### Setup (Azure portal)
1. portal.azure.com → App registrations → New registration
2. Name: RAG Communications Hub
3. Supported account type: Accounts in any organizational directory and personal Microsoft accounts
4. Redirect URI: https://readyaimgo.biz/api/auth/outlook/callback
5. Register → copy Application (client) ID = OUTLOOK_CLIENT_ID
6. Certificates & secrets → New client secret → copy Value immediately
7. API permissions → Add → Microsoft Graph → Delegated:
   - Mail.Read
   - Calendars.Read
   - offline_access
8. Grant admin consent

OUTLOOK_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
OUTLOOK_CLIENT_SECRET=your-secret-value
OUTLOOK_TENANT_ID=common
OUTLOOK_REDIRECT_URI=https://readyaimgo.biz/api/auth/outlook/callback

### One-time OAuth flow
Visit in browser while signed into your Microsoft account:
https://login.microsoftonline.com/common/oauth2/v2.0/authorize
  ?client_id=YOUR_OUTLOOK_CLIENT_ID
  &response_type=code
  &redirect_uri=https://readyaimgo.biz/api/auth/outlook/callback
  &scope=Mail.Read Calendars.Read offline_access
  &response_mode=query

---

## 6. iMessage Sync (Local script — Mac only)

Cost: $0. iMessage is free.

### One-time macOS permission
System Settings → Privacy & Security → Full Disk Access → add Terminal

### Setup
1. Edit: readyaimgo-communications-hub-app/scripts/imessage-sync.js
2. Populate RAG_ALLOWLIST with client contacts:
   { clientId: 'hroshi', contact: '+1XXXXXXXXXX', name: 'Maia (Hroshi)' }
   clientId must match the Firestore document ID exactly
3. Install dependencies:
   cd readyaimgo-communications-hub-app
   npm install better-sqlite3 firebase-admin dotenv
4. Run historical backfill (one time):
   node scripts/imessage-sync.js --mode=backfill
5. Ongoing watch (keep terminal tab open):
   node scripts/imessage-sync.js --mode=watch

### Searching synced messages
node scripts/imessage-search.js --client=hroshi --q="payment"
node scripts/imessage-search.js --all --from=2024-01-01

---

## 7. WhatsApp (Meta for Developers)

Cost: Free tier — 1,000 conversations/month free

### Where messages go
Client WhatsApp → POST /webhooks/whatsapp (readyaimgo-communications-hub-app)
→ written to Firestore clientMessages collection (source: "whatsapp")
→ posted to mapped Slack channel for that client
→ intent router classifies as payment/task/schedule/feedback

To map a new WhatsApp number to a client, add a Firestore document:
Collection: clientComms → Document ID: the client ID
Fields: clientId, displayName, whatsappFromNumbers (array), slackChannelId

### Setup
1. developers.facebook.com → My Apps → Create App → Business
2. Add WhatsApp product
3. Configuration → Webhook URL: https://[comms-hub-domain]/webhooks/whatsapp
4. Verify token: set any random string (same value as WHATSAPP_VERIFY_TOKEN)
5. Subscribe to "messages" webhook field

WHATSAPP_VERIFY_TOKEN=your-random-string
META_APP_SECRET=from-app-dashboard-settings

---

## 8. Stripe

Cost: 2.9% + 30¢ per transaction. No monthly fee.

### Setup
1. dashboard.stripe.com → Developers → API Keys
2. Copy Secret key (sk_live_ for production, sk_test_ for testing)
3. Developers → Webhooks → Add endpoint
4. Endpoint URL: https://readyaimgo.biz/api/pulse/stripe
5. Events: payment_intent.succeeded, payment_link.completed
6. Copy Signing secret (whsec_...)

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

---

## 9. Apple Developer Program

Cost: $99/year
Required for: real device distribution (Ad Hoc, TestFlight, App Store)
Without it: simulator builds only (current mode in GitHub Actions workflows)

### Current state
All iOS apps (raCommand, readyaimgoOperator, HroshiPreviewApp, BEAMField, BEAMFood, BeamHive)
have GitHub Actions workflows configured for simulator builds.
When Apple account is paid, uncomment the beta-distribution job in each:
  .github/workflows/distribute.yml

### After paying
1. developer.apple.com → Certificates → create iOS Distribution certificate
2. Export as .p12 with password
3. Create Ad Hoc Provisioning Profile for each app
4. Base64-encode cert and profiles
5. Add as GitHub Secrets in each repo

GitHub Secrets needed per iOS repo:
APPLE_TEAM_ID=26HZ47X5B4
DIST_CERT_BASE64=[base64 of .p12]
DIST_CERT_PASSWORD=[password]
PROVISIONING_PROFILE_BASE64=[base64 of .mobileprovision]
PROVISIONING_PROFILE_NAME=[name from Apple Developer portal]
FIREBASE_TOKEN=[from: firebase login:ci]
FIREBASE_APP_ID_RACOMMAND=[from Firebase console]

To base64-encode: base64 -i dist_cert.p12 | pbcopy

---

## 10. Vercel

Cost: Free tier for most use. Pro ($20/mo) needed for cron jobs (auto Gmail/Outlook sync).

### Getting a token
vercel.com → Account Settings → Tokens → Create → Full Account scope

VERCEL_TOKEN=your-vercel-token

### Cron jobs (requires Pro plan)
Add to vercel.json in ready-aim-go-website-for-deploy:
{
  "crons": [
    { "path": "/api/comms/sync", "schedule": "0 * * * *" },
    { "path": "/api/comms/outlook/sync", "schedule": "0 * * * *" },
    { "path": "/api/comms/calendar-sync", "schedule": "0 */6 * * *" }
  ]
}

Without Pro: trigger syncs manually from the Command Center at /dashboard/command,
or use a free external cron service like cron-job.org pointing at your endpoints.

---

## 11. GitHub

GITHUB_PAT=ghp_...
Scope needed: repo (full), workflow
Already configured with top-level repo scope — do not change.

---

## Dashboard Routes — What's Built and Where

/dashboard                       → Operations overview (sync health, alerts, area coverage)
/dashboard/command               → Command Center (all segments: RAG + BEAM + Personal)
/dashboard/calendar              → Calendar view (pulls from Google Calendar via pulse API)
/dashboard/comms                 → Communications (Gmail + Slack, with reply composer)
/dashboard/admin/build-tracker   → Build tracker (all projects, tasks, Claude prompt generator)
/dashboard/admin/services        → Infrastructure cost tracker
/dashboard/clients               → Client directory
/dashboard/clients/[id]          → Individual client detail
/dashboard/finance               → Finance overview (Stripe)
/dashboard/staff                 → Staff operations

---

## What Fires Automatically (Once Env Vars Set)

Gmail sync → every hour (or manually via /api/comms/sync)
  → writes to clientMessages
  → intent router classifies: payment/task/schedule/feedback
  → event extractor surfaces scheduling suggestions in Command Center

Outlook sync → every hour (or manually via /api/comms/outlook/sync)
  → same pipeline as Gmail

Calendar sync → every 6 hours (or manually via Sync Calendars button)
  → pulls Google Calendar + UWM ICS + personal ICS
  → segments events as rag / beam / personal
  → conflict detection in Command Center

WhatsApp → real-time via webhook
  → clientMessages → intent router → Slack notification

iMessage → every 5 min if watch mode running locally
  → same clientMessages → intent router pipeline

---

## Phase Priority Order

Phase 1 — Login and basic dashboard (do now)
  ✓ Firebase client env vars in .env.local
  ✓ Enable Google auth in Firebase console
  ✓ Create users/{uid} doc with role: admin
  ✓ Set Firestore rules
  → Try logging in

Phase 2 — AI and comms (after login works)
  → Anthropic API key at console.anthropic.com with ezra@readyaimgo.biz
  → Google OAuth one-time flow for Gmail + Calendar
  → UWM ICS URL already in Vercel — add to .env.local too

Phase 3 — Full comms pipeline
  → Azure app for Outlook
  → iMessage sync script with RAG_ALLOWLIST populated
  → WhatsApp webhook configured

Phase 4 — Distribution (when budget available)
  → Apple Developer $99
  → Stripe live keys
  → Vercel Pro for cron jobs
