/**
 * GET /api/videos/scan-drive
 *
 * Scans Google Drive for new Meet recordings and auto-processes them.
 * Record a Meet → it saves to Drive → this picks it up every 15 min.
 *
 * Add to vercel.json crons with an every-15-minutes schedule.
 *
 * ── NAMING CONVENTIONS SUPPORTED ─────────────────────────────────────────────
 *
 * Mode A — Set Meet title before recording (preferred, zero extra work)
 *   Set Meet title: "clients — portal walkthrough"
 *   Drive saves as: "Meet Recording: clients — portal walkthrough (2026-06-07...).mp4"
 *   → Parsed as clientSlug="clients", auto-titled "Clients Build Update — June 7 2026"
 *
 * Mode B — Rename in Drive after (30 seconds, most flexible)
 *   Rename to: "clients_update_2026-06-07.mp4"
 *   → Same format as Firebase Storage convention, always works
 *
 * Mode C — RAG prefix shorthand
 *   Rename to: "RAG: mkeblack 2026-06-07"
 *   → Parsed as clientSlug="mkeblack"
 *
 * ── WHAT HAPPENS TO UNMATCHED FILES ──────────────────────────────────────────
 * Files that can't be matched to a client slug are written to
 * Firestore "unprocessedDriveVideos" collection with a rename suggestion.
 * Check the admin dashboard or Firestore console to see them.
 *
 * ── ENV VARS ─────────────────────────────────────────────────────────────────
 * GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (already set)
 * DRIVE_RECORDINGS_FOLDER_ID  — optional, restricts search to one folder
 *                               Get from Drive folder URL: drive.google.com/drive/folders/{ID}
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin"

// ── Known client slugs — add new clients here as you onboard them ─────────────
const KNOWN_SLUGS = [
  "clients",
  "readyaimgo",
  "mkeblack",
  "hroshi",
  "together-for-homes",
  "paynepros",
  "beam",
  "beamfcu",
  "stillroom",
  "ibms",
  "space",
  "motion",
  "nexus",
  "cohort",
]

// ── Token refresh ─────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID     ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
      grant_type:    "refresh_token",
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`)
  return data.access_token
}

// ── Parse client slug and date from any supported naming format ───────────────

function parse(title: string): { clientSlug: string | null; date: string } {
  const today = new Date().toISOString().split("T")[0]

  // Mode B / Firebase convention: clientslug_update_2026-06-07.mp4
  const modeB = title.match(/^([a-z][a-z0-9-]*)_(?:update_)?(\d{4}-\d{2}-\d{2})/i)
  if (modeB) return { clientSlug: modeB[1].toLowerCase(), date: modeB[2] }

  // Mode A: "Meet Recording: {title} ({date}...)"
  const modeA = title.match(/Meet Recording:\s*(.+?)\s*\((\d{4}-\d{2}-\d{2})/i)
  if (modeA) {
    const raw = modeA[1].toLowerCase().trim()
    const date = modeA[2]
    // Grab first dash-separated or space-separated word that matches known slugs
    for (const slug of KNOWN_SLUGS) {
      if (raw.startsWith(slug) || raw.includes(slug)) {
        return { clientSlug: slug, date }
      }
    }
    // Fall back to first word before — or space
    const firstWord = raw.split(/[\s—–-]/)[0].replace(/[^a-z0-9-]/g, "")
    if (firstWord.length >= 3) return { clientSlug: firstWord, date }
    return { clientSlug: null, date }
  }

  // Mode C: "RAG: clientslug 2026-06-07"
  const modeC = title.match(/^RAG:\s*([a-z][a-z0-9-]*)(?:\s+(\d{4}-\d{2}-\d{2}))?/i)
  if (modeC) return { clientSlug: modeC[1].toLowerCase(), date: modeC[2] ?? today }

  // Fallback: check if filename starts with a known slug
  for (const slug of KNOWN_SLUGS) {
    if (title.toLowerCase().startsWith(slug)) return { clientSlug: slug, date: today }
  }

  return { clientSlug: null, date: today }
}

function buildTitle(slug: string, date: string): string {
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const d = new Date(date + "T12:00:00Z")
  const formatted = isNaN(d.getTime()) ? date : d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })
  return `${name} Build Update — ${formatted}`
}

// ── Download Drive file → Firebase Storage ────────────────────────────────────

async function driveToStorage(
  fileId: string,
  filename: string,
  token: string
): Promise<string> {
  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!driveRes.ok) throw new Error(`Drive download ${driveRes.status}`)

  const bucket = getAdminStorage()
  const storagePath = `raw-client-updates/${filename}`
  const buffer = Buffer.from(await driveRes.arrayBuffer())

  await bucket.file(storagePath).save(buffer, {
    metadata: {
      contentType: "video/mp4",
      metadata: { source: "google-drive", driveFileId: fileId },
    },
  })

  return storagePath
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = getAdminDb()

  // Get Google token
  let token: string
  try {
    token = await getAccessToken()
  } catch (err) {
    return NextResponse.json({ error: "Google auth failed — check GOOGLE_REFRESH_TOKEN" }, { status: 500 })
  }

  // Build Drive search — last 25 hours to handle timezone edge cases
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  const folderId = process.env.DRIVE_RECORDINGS_FOLDER_ID

  let q = `mimeType contains 'video/' and modifiedTime > '${since}'`
  if (folderId) {
    q += ` and '${folderId}' in parents`
  } else {
    q += ` and (name contains 'Meet Recording' or name contains 'RAG:' or name contains '_update_')`
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,size)&pageSize=25`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const searchData = await searchRes.json()
  const files = searchData.files ?? []

  if (files.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, skipped: 0, unmatched: 0, message: "No new Drive recordings" })
  }

  let processed = 0, skipped = 0, unmatched = 0
  const results: string[] = []

  for (const file of files) {
    const markerDocId = `drive_${file.id}`

    // Skip already-processed
    const marker = await db.collection("processedVideos").doc(markerDocId).get()
    if (marker.exists) { skipped++; continue }

    const { clientSlug, date } = parse(file.name as string)

    if (!clientSlug) {
      unmatched++
      // Save to "needs review" queue in Firestore
      await db.collection("unprocessedDriveVideos").doc(file.id).set({
        driveFileId: file.id,
        originalName: file.name,
        reason: "Cannot parse client slug",
        suggestion: `Rename to: {clientslug}_update_${date}.mp4 or set Meet title to start with client name`,
        discoveredAt: new Date().toISOString(),
        status: "needs-rename",
      }, { merge: true })
      results.push(`SKIP "${file.name}" — rename needed`)
      continue
    }

    const title = buildTitle(clientSlug, date)
    const storageFilename = `${clientSlug}_update_${date}.mp4`

    try {
      const storagePath = await driveToStorage(file.id, storageFilename, token)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://readyaimgo.biz"

      const processRes = await fetch(`${appUrl}/api/videos/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath, clientSlug, title }),
      })
      const processData = await processRes.json()

      if (processData.success) {
        await db.collection("processedVideos").doc(markerDocId).set({
          driveFileId: file.id,
          originalName: file.name,
          clientSlug, title, storagePath,
          videoId: processData.videoId,
          processedAt: new Date().toISOString(),
          source: "google-drive",
        })
        processed++
        results.push(`OK "${file.name}" → ${clientSlug}`)
      } else {
        results.push(`FAIL "${file.name}" — ${processData.error}`)
      }
    } catch (err) {
      results.push(`ERROR "${file.name}" — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    processed, skipped, unmatched,
    total: files.length,
    results,
    ...(unmatched > 0 && {
      hint: "Files that need renaming are in Firestore 'unprocessedDriveVideos' collection",
    }),
  })
}
