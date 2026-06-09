# RAG Client Video Pipeline — Google Meet Workflow
# How to record a client update video and have it appear in their portal automatically

---

## THE ONE-SENTENCE VERSION

Set your Meet title to start with the client name, record, stop — done.
The rest happens automatically within 15 minutes.

---

## STEP 1 — Before you start recording

Open Google Meet. Before hitting record, set the meeting title.

**Title format:**
  {clientname} — {what you're showing}

**Examples:**
  clients — portal walkthrough
  mkeblack — Phase 4 marketplace build
  hroshi — landing page update
  together-for-homes — permit dashboard
  paynepros — admin interface
  space — service page walkthrough
  nexus — workspace demo

The first word before " — " is how the system identifies which client this belongs to.
Everything after " — " is just for your own reference — it doesn't affect the pipeline.

---

## STEP 2 — Record

Start Meet → click the three-dot menu → Record meeting.
Record what you want the client to see. Screen share your work.
Talk through it — Claude will transcribe and summarize from your audio.

Stop recording when done.

---

## STEP 3 — Nothing (the pipeline takes over)

Google automatically saves the recording to your Drive in the "Meet Recordings" folder.
File name will be: "Meet Recording: clients — portal walkthrough (2026-06-07 at 10.34 AM GMT-5).mp4"

Within 15 minutes, Vercel cron calls /api/videos/scan-drive which:
  1. Finds the new file
  2. Downloads it from Drive
  3. Uploads to Firebase Storage
  4. Sends to Claude → 3-bullet AI summary generated
  5. Writes to Firestore: clients/{clientId}/statusVideos/{id}
  6. Sends SMS to client: "Your clients.readyaimgo.biz walkthrough is ready — [link]"

Client opens their portal → sees the video card → plays it → reads the summary.

---

## IF THE FILE DOESN'T GET MATCHED (optional rename)

If the scan can't figure out the client from the Meet title, it puts the file
in Firestore "unprocessedDriveVideos" with a rename suggestion.

To fix: go to Google Drive → find the recording → rename it to:
  {clientslug}_update_{YYYY-MM-DD}.mp4

Examples:
  clients_update_2026-06-07.mp4
  mkeblack_update_2026-06-07.mp4
  hroshi_update_2026-06-07.mp4

Within the next 15-minute cron cycle, it gets picked up automatically.

---

## KNOWN CLIENT SLUGS (what the system recognizes)

  clients           → clients.readyaimgo.biz portal
  readyaimgo        → readyaimgo.biz main site
  mkeblack          → MKE Black directory
  hroshi            → Hroshi Bitcoin benefit
  together-for-homes → TFH permit dashboard
  paynepros         → PaynePros accounting
  beam              → BEAM Institute
  beamfcu           → BEAM FCU
  stillroom         → Stillroom Music
  ibms              → IBMS
  space             → Space Network
  motion            → Motion Network
  nexus             → Nexus subscription
  cohort            → Cohort Network

To add a new client: add their slug to the KNOWN_SLUGS array in
app/api/videos/scan-drive/route.ts and to CLIENT_FEATURE_SEEDS in
app/api/client-features/route.ts

---

## ENV VAR TO ADD (one new one)

DRIVE_RECORDINGS_FOLDER_ID — optional but recommended.
Restricts the Drive scan to your "Meet Recordings" folder instead
of searching all of Drive. Get the ID from the folder URL:
  drive.google.com/drive/folders/{FOLDER_ID_IS_HERE}

Add to Vercel + .env.local:
  DRIVE_RECORDINGS_FOLDER_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs (example ID)

Without this, the scan searches all recent video files in your Drive
that match the Meet Recording naming pattern — still works, just broader.

---

## MANUAL TRIGGER (test it right now without waiting for cron)

After setting up env vars and deploying, test the pipeline instantly:
  curl https://readyaimgo.biz/api/videos/scan-drive

Or from your browser while logged into the admin:
  https://readyaimgo.biz/api/videos/scan-drive

It returns JSON showing what was found, processed, skipped, or needs renaming.

---

## THE FULL AUTOMATED CHAIN (all automatic after you stop recording)

Google Meet recording saves to Drive
  ↓ (instantly)
Drive "Meet Recordings" folder contains new .mp4

Every 15 minutes, Vercel cron fires /api/videos/scan-drive
  ↓
Finds files modified in last 25 hours not yet in processedVideos collection
  ↓
Parses client slug from filename / Meet title
  ↓ (matched)                    ↓ (unmatched)
Downloads from Drive         → writes to unprocessedDriveVideos Firestore
Uploads to Firebase Storage  → rename the file and wait for next cron cycle
  ↓
Calls /api/videos/process
  ↓
Claude reads video → generates 3-bullet summary + transcript
  ↓
Writes to Firestore: clients/{clientId}/statusVideos/{videoId}
  ↓
Sends Telnyx SMS to client phone number
  ↓
Client portal (clients.readyaimgo.biz) shows video card in real time
Client plays video → reads "What we built" summary bullets
