/**
 * GET /api/videos/scan
 *
 * Vercel cron job — runs every 15 minutes.
 * Scans Firebase Storage raw-client-updates/ for new videos,
 * processes each one automatically via /api/videos/process.
 *
 * Add to vercel.json crons with an every-15-minutes schedule.
 *
 * Upload naming convention:
 *   {clientSlug}_update_{YYYY-MM-DD}.mov
 *   Examples: mkeblack_update_2026-06-06.mov
 *             hroshi_update_2026-06-06.mp4
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin"

const RAW_VIDEO_PREFIX = "raw-client-updates/"
const SUPPORTED_EXTENSIONS = [".mov", ".mp4", ".webm", ".mkv"]

function parseClientSlug(filename: string): string | null {
  const withoutExt = filename.replace(/\.[^.]+$/, "")
  const parts = withoutExt.split("_")
  if (parts.length < 2) return null
  return parts[0].toLowerCase()
}

function parseTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, "")
  const parts = withoutExt.split("_")
  const slug = parts[0]
  const datePart = parts[parts.length - 1]
  let formattedDate = datePart
  try {
    const d = new Date(datePart)
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    }
  } catch {}
  const readableSlug = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return `${readableSlug} Build Update — ${formattedDate}`
}

export async function GET(req: NextRequest) {
  // Allow Vercel cron OR internal calls with cron secret
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const bucket = getAdminStorage()

    const [files] = await bucket.getFiles({ prefix: RAW_VIDEO_PREFIX })
    const videoFiles = files.filter((file) => {
      const name = file.name.replace(RAW_VIDEO_PREFIX, "")
      if (!name) return false
      return SUPPORTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))
    })

    if (videoFiles.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: "No new videos" })
    }

    let processed = 0
    let skipped = 0
    const results: string[] = []

    for (const file of videoFiles) {
      const filename = file.name.replace(RAW_VIDEO_PREFIX, "")
      const markerDocId = filename.replace(/[^a-zA-Z0-9]/g, "_")

      // Skip already-processed files
      const marker = await db.collection("processedVideos").doc(markerDocId).get()
      if (marker.exists) { skipped++; continue }

      const clientSlug = parseClientSlug(filename)
      if (!clientSlug) {
        results.push(`SKIP ${filename} — cannot parse client slug`)
        continue
      }

      const title = parseTitle(filename)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://readyaimgo.biz"

      const res = await fetch(`${appUrl}/api/videos/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: file.name, clientSlug, title }),
      })
      const data = await res.json()

      if (data.success) {
        await db.collection("processedVideos").doc(markerDocId).set({
          filename, clientSlug, title,
          videoId: data.videoId,
          processedAt: new Date().toISOString(),
        })
        processed++
        results.push(`OK ${filename} → ${clientSlug}`)
      } else {
        results.push(`FAIL ${filename} — ${data.error}`)
      }
    }

    return NextResponse.json({ ok: true, processed, skipped, total: videoFiles.length, results })
  } catch (err) {
    console.error("[videos/scan]", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Scan failed" }, { status: 500 })
  }
}
