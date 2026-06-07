# RAG Communication Kernel — Complete Build Guideline
# Covers: Telnyx SMS, Communication Kernel, Video Pipeline, Chrome Extension
# Last updated: June 2026

---

## OVERVIEW — What We Are Building

Three interconnected systems that together form the RAG Communication Kernel:

1. **Telnyx SMS Layer** — inbound/outbound SMS for all client and Space Network communication
2. **Video Pipeline** — upload raw screen recordings → AI processes → client portal shows status update videos with SMS alert sent via Telnyx
3. **Chrome Extension** — clients install from their portal, capture visual feedback on their live site, posts directly to RAG admin task queue

All three write to the same Firestore namespace (readyaimgo-ab187) and surface in:
- `readyaimgo.biz/dashboard` — admin view
- `clients.readyaimgo.biz/portal/[clientId]` — client view

---

## PHASE 1 — TELNYX SMS (Complete tonight)

### Files already written

- `app/api/webhooks/sms/route.ts` — inbound webhook, Communication Kernel routing
- `lib/telnyx.ts` — outbound SMS helper, payment link sender

### Environment variables to add to Vercel

```
TELNYX_API_KEY=KEY_...          ← Telnyx portal → API Keys → Create Key
TELNYX_PUBLIC_KEY=...           ← Same page, public key for webhook verification
TELNYX_PHONE_NUMBER=+1414...    ← Your purchased Telnyx number in E.164 format
```

Also add to `.env.local` for local development.

### Telnyx portal setup (6 steps — in progress)

Step 1: Profile name = "ReadyAimGo SMS", API Version = V2
Step 2: Allowed destinations = United States + Canada ONLY (fraud protection)
Step 3: Inbound webhook URL = https://readyaimgo.biz/api/webhooks/sms
Step 4: Outbound — leave defaults
Step 5: Buy a 414 Milwaukee area code number ($1/mo)
Step 6: Review and create

### How the Communication Kernel routes messages

When a text arrives at your Telnyx number:

```
Incoming SMS → /api/webhooks/sms
    ↓
Is sender in PERSONAL_CONTACTS list?
    YES → write to personalWorkspace/ (private, never in admin)
    NO  → look up phone in clients collection
        ↓
    clientId found?
        YES → write to clientMessages/ → fire /api/comms/intent
        NO  → write to clientMessages/ with needsClientMatch: true
              (appears in admin as "Unknown sender — needs review")
```

### Intent router actions (already built, now SMS-aware)

- **payment intent** → creates Stripe link → calls sendPaymentLinkSMS() → texts link to client
- **schedule intent** → creates task in tasks/ collection → admin sees it
- **task intent** → creates deliverable task → admin sees it
- **feedback intent** → writes to feedback/ → admin sees it

### Mapping new phone numbers to clients

When an unknown sender texts in, go to:
`readyaimgo.biz/dashboard/comms` → find the "Unknown sender" entry → click "Assign to client" → select client from dropdown → writes phone to clientComms/{clientId}.whatsappFromNumbers array

Or add directly in Firestore:
`clientComms/{clientId}` → add phone number to `whatsappFromNumbers` array field

---

## PHASE 2 — VIDEO PIPELINE (Build this week)

### What it does

You drop a raw screen recording into Firebase Storage.
A Cloud Function or API route detects it, processes it, and:
1. Applies an intro title banner with client name
2. Runs Gemini audio extraction → 3-bullet summary
3. Writes metadata to `clients/{clientId}/statusVideos/{videoId}`
4. Sends SMS to client via Telnyx: "Your build update is live — [signed URL]"
5. Client sees it in their portal under a "Status Updates" tab

### Firestore schema

```
clients/{clientId}/statusVideos/{videoId}/
  title: "June 6 Build Update"
  videoUrl: "https://firebasestorage.googleapis.com/..."
  thumbnailUrl: string | null
  aiSummary: string               ← Gemini-generated 3-bullet summary
  rawTranscript: string           ← Full transcript from Gemini
  category: "web" | "app" | "ops" | "general"
  sentSMSAt: string | null        ← timestamp of Telnyx alert
  createdAt: string
  uploadedBy: "ezra@readyaimgo.biz"
```

### Upload naming convention

Name your raw recordings before uploading to Firebase Storage:
`{clientSlug}_update_{YYYY-MM-DD}.mov`
Examples:
- `mkeblack_update_2026-06-06.mov`
- `hroshi_update_2026-06-06.mov`
- `together-for-homes_update_2026-06-06.mov`

Upload to Storage path: `raw-client-updates/{filename}`

### Codex prompt to build the video pipeline API route

Paste this into Codex in ready-aim-go-website-for-deploy-clean:

```
Build POST /api/videos/process in ready-aim-go-website-for-deploy-clean.

This route is called by a Firebase Storage trigger or manually when a new
raw client update video is uploaded to Storage path: raw-client-updates/

What it does:
1. Accepts body: { storagePath: string, clientSlug: string, title?: string }
2. Looks up clientId from clients collection where storyId == clientSlug
3. Gets a signed download URL for the raw video from Firebase Storage Admin SDK
4. Calls the Gemini API (gemini-2.5-flash) with the video URL to extract:
   - A 3-bullet "nightly win checklist" summary (aiSummary field)
   - A plain text transcript (rawTranscript field)
   Use this system prompt: "You are summarizing a screen recording of web or app
   development work for a business client. Extract exactly 3 bullet points
   describing what was built or changed. Be specific and client-friendly — avoid
   technical jargon. Format as plain text bullets starting with •"
5. Moves the processed video from raw-client-updates/ to client-videos/{clientId}/
6. Creates a public download URL for the processed video
7. Writes a document to clients/{clientId}/statusVideos/{autoId} with the schema
   defined in the video pipeline guideline
8. If client has a phone number in clientComms/{clientId}.phone or clients/{clientId}.phone,
   calls lib/telnyx.sendSMS() with message:
   "ReadyAimGo: Your [title] is ready. Watch it here: [signedUrl]"
9. Returns { success: true, videoId, clientId, aiSummary }

Use getAdminDb() from lib/firebase/admin for Firestore.
Use getAdminStorage() for Firebase Storage.
Use process.env.ANTHROPIC_API_KEY for Gemini (use Anthropic Claude API instead
of Gemini since we already have that key configured — use claude-sonnet-4-20250514).
```

### Codex prompt to add Status Updates tab to clients.readyaimgo.biz

Paste this into Codex in clients.readyaimgo.biz:

```
In app/portal/[clientId]/page.tsx, add a "Status Updates" tab to the existing
tab layout. The tab should:

1. Query Firestore collection clients/{clientId}/statusVideos ordered by
   createdAt descending, limit 10
2. Render each video as a card with:
   - Title (e.g. "June 6 Build Update")
   - An HTML5 video player with the videoUrl
   - The aiSummary displayed as 3 bullet points below the player
   - The date in "June 6, 2026" format
   - A "Past updates" expandable list showing previous videos by date
3. If no videos exist yet, show an empty state: "Build updates will appear here
   when your ReadyAimGo team uploads them."
4. Use the existing portal card aesthetic — white background, rounded corners,
   consistent with the Deliverables and Feedback cards already on this page.
```

---

## PHASE 3 — CHROME EXTENSION (Build next week)

### What it does

Client installs a Chrome Extension from their portal.
When browsing their live site, they click the extension icon.
A floating drawer appears — they type a note, optionally screenshot the page.
On submit, it POSTs to clients.readyaimgo.biz/api/portal/extension-notes.
The note appears in readyaimgo.biz/dashboard/clients as a high-priority task.

### Files to create

```
chrome-extension/
  manifest.json
  background.js
  content.js
  popup.html
  popup.js
  icon-48.png
  icon-128.png
```

### Codex prompt to build the Chrome Extension

Paste this into Codex — create a new folder chrome-extension/ at the root of
ready-aim-go-website-for-deploy-clean:

```
Create a Manifest V3 Chrome Extension in a new folder called chrome-extension/
at the root of ready-aim-go-website-for-deploy-clean.

Purpose: Lets clients capture visual feedback notes on their live website
and post them directly to the RAG admin task queue.

manifest.json requirements:
- name: "ReadyAimGo Assistant"
- version: "1.0.0"
- manifest_version: 3
- permissions: ["activeTab", "storage", "scripting"]
- action: popup is popup.html
- icons: 48px and 128px (use placeholder PNG for now)

Authentication flow:
When the client first installs the extension, they enter their clientId
(shown on their portal page) and their email. These are stored in
chrome.storage.local as { clientId, email, authenticated: true }.

popup.html UI:
- If not authenticated: show a simple form asking for clientId and email,
  a "Connect" button, and a note saying "Find your Client ID on your portal page"
- If authenticated: show a textarea "Describe the issue or feedback",
  a dropdown to categorize (Design / Content / Functionality / Other),
  a "Capture screenshot" button that uses chrome.tabs.captureVisibleTab,
  and a "Send to ReadyAimGo" button

popup.js on submit:
1. Get the current tab URL from chrome.tabs.query
2. Capture a screenshot as base64 PNG using chrome.tabs.captureVisibleTab
3. POST to https://clients.readyaimgo.biz/api/portal/extension-notes with body:
   { clientId, email, note, category, pageUrl, screenshot: base64string, timestamp }
4. Show "Sent! Your team has been notified." on success

Also create app/api/portal/extension-notes/route.ts in clients.readyaimgo.biz:
POST handler that:
1. Validates clientId exists in Firestore clients collection
2. Uploads screenshot to Firebase Storage at extension-notes/{clientId}/{timestamp}.png
3. Writes to projectTasks Firestore collection:
   { clientId, source: "chrome-extension", note, category, pageUrl,
     screenshotUrl, status: "needs-review", priority: "high", createdAt }
4. Returns { success: true }
```

### Admin display for extension notes

Codex prompt for readyaimgo.biz:

```
In app/dashboard/clients/page.tsx or the client detail page, add a section
that shows incoming Chrome Extension notes from the projectTasks collection
where source == "chrome-extension" and status == "needs-review".

Display each as a high-signal alert row with:
- A distinct amber/yellow left border (not red — not an error, just high priority)
- The note text
- The page URL it was captured from (as a clickable link)
- A small thumbnail of the screenshot if screenshotUrl exists
- The category badge (Design / Content / Functionality / Other)
- Two action buttons: "Mark reviewed" (updates status to "reviewed") and
  "Convert to task" (moves the note into the main deliverables list for that client)
```

---

## PHASE 4 — ENVIRONMENT VARIABLES MASTER LIST

Add all of these to Vercel (ready-aim-go-website-for-deploy-clean project)
and to your local .env.local:

```
# Telnyx
TELNYX_API_KEY=KEY_...
TELNYX_PUBLIC_KEY=...
TELNYX_PHONE_NUMBER=+1414...

# Already have these — confirm they are set:
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=readyaimgo-ab187
FIREBASE_SERVICE_ACCOUNT_KEY={...json...}
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_APP_URL=https://readyaimgo.biz
```

---

## SEQUENCE — What to Do and When

### Tonight (30 min)
1. Finish Telnyx messaging profile setup (Steps 3-6)
2. Buy 414 phone number in Telnyx portal
3. Add TELNYX_API_KEY, TELNYX_PUBLIC_KEY, TELNYX_PHONE_NUMBER to Vercel + .env.local
4. Deploy — the SMS webhook is already written and will be live

### Tomorrow
5. Test SMS: text your new Telnyx number from your phone
6. Check Firestore → clientMessages collection — the message should appear
7. If unknown sender: go to dashboard/comms → assign to a client
8. Run the video pipeline Codex prompt to build /api/videos/process

### This week
9. Run the status updates portal tab Codex prompt
10. Upload your first test video to Firebase Storage raw-client-updates/
11. Call POST /api/videos/process manually to test the full pipeline
12. Confirm client receives SMS with video link

### Next week
13. Run the Chrome Extension Codex prompts
14. Install the extension in Chrome developer mode to test
15. Generate a CRX package for distribution from the portal
