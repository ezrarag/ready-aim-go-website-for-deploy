/**
 * GET /api/videos/scan-drive
 *
 * Scans Google Drive for new client update recordings.
 * - dryRun=true: reports Drive/client/workspace/statusVideo linkage only.
 * - default cron/live mode: downloads matched videos, processes them, and marks them processed.
 */

import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

type ClientRegistryEntry = {
  id: string
  name: string
  storyId: string
  phoneReady: boolean
  aliases: string[]
  workspaceIds: string[]
}

type DriveFile = {
  id: string
  name: string
  modifiedTime?: string
  size?: string
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function domainSlug(value: string) {
  try {
    const host = value.includes("://") ? new URL(value).hostname : value
    return slugify(host.replace(/^www\./, "").split(".")[0] ?? "")
  } catch {
    return slugify(value.split(".")[0] ?? value)
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`)
  return data.access_token
}

function parseFilename(title: string): { parsedSlug: string | null; date: string; mode: string } {
  const today = new Date().toISOString().split("T")[0]

  const modeB = title.match(/^([a-z][a-z0-9-]*)_(?:update_)?(\d{4}-\d{2}-\d{2})/i)
  if (modeB) return { parsedSlug: modeB[1].toLowerCase(), date: modeB[2], mode: "filename" }

  const modeA = title.match(/Meet Recording:\s*(.+?)\s*\((\d{4}-\d{2}-\d{2})/i)
  if (modeA) {
    const raw = modeA[1].toLowerCase().trim()
    const firstWord = raw.split(/[\s-]/)[0]?.replace(/[^a-z0-9-]/g, "") ?? ""
    return { parsedSlug: firstWord.length >= 3 ? firstWord : null, date: modeA[2], mode: "meet" }
  }

  const modeC = title.match(/^RAG:\s*([a-z][a-z0-9-]*)(?:\s+(\d{4}-\d{2}-\d{2}))?/i)
  if (modeC) return { parsedSlug: modeC[1].toLowerCase(), date: modeC[2] ?? today, mode: "rag" }

  return { parsedSlug: null, date: today, mode: "unparsed" }
}

function buildTitle(slug: string, date: string): string {
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const d = new Date(date + "T12:00:00Z")
  const formatted = isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  return `${name} Build Update - ${formatted}`
}

function addAliases(target: Set<string>, values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue
    target.add(value.trim().toLowerCase())
    const slug = slugify(value)
    if (slug) target.add(slug)
    const domain = domainSlug(value)
    if (domain) target.add(domain)
  }
}

async function loadClientRegistry(): Promise<ClientRegistryEntry[]> {
  const db = getAdminDb()
  const [clientsSnap, workspacesSnap, commsSnap] = await Promise.all([
    db.collection("clients").limit(500).get(),
    db.collection("workspaces").limit(500).get(),
    db.collection("clientComms").limit(500).get(),
  ])

  const phoneReadyByClientId = new Map<string, boolean>()
  for (const doc of commsSnap.docs) {
    const data = doc.data()
    phoneReadyByClientId.set(doc.id, Boolean(readString(data.phone) || readString(data.smsPhone)))
  }

  const workspaceIdsByClientId = new Map<string, string[]>()
  const workspaceAliasByClientId = new Map<string, string[]>()
  for (const doc of workspacesSnap.docs) {
    const data = doc.data()
    const clientId = readString(data.clientId)
    if (!clientId) continue
    const vercelProjects = Array.isArray(data.vercelProjects)
      ? data.vercelProjects.flatMap((project) => {
          if (!project || typeof project !== "object") return []
          const record = project as Record<string, unknown>
          return [
            readString(record.name),
            readString(record.projectName),
            readString(record.url),
            readString(record.productionUrl),
          ]
        })
      : []
    workspaceIdsByClientId.set(clientId, [...(workspaceIdsByClientId.get(clientId) ?? []), doc.id])
    workspaceAliasByClientId.set(clientId, [
      ...(workspaceAliasByClientId.get(clientId) ?? []),
      doc.id,
      readString(data.name),
      readString(data.workspaceName),
      readString(data.businessName),
      readString(data.clientBusinessName),
      readString(data.primaryDomain),
      readString(data.targetDomain),
      ...readStringArray(data.domains),
      ...vercelProjects,
    ])
  }

  return clientsSnap.docs
    .map((doc) => {
      const data = doc.data()
      const aliases = new Set<string>()
      const storyId = readString(data.storyId) || doc.id
      const vercelProjects = Array.isArray(data.vercelProjects)
        ? data.vercelProjects.flatMap((project) => {
            if (!project || typeof project !== "object") return []
            const record = project as Record<string, unknown>
            return [
              readString(record.name),
              readString(record.projectName),
              readString(record.url),
              readString(record.productionUrl),
            ]
          })
        : []

      addAliases(aliases, [
        doc.id,
        storyId,
        readString(data.clientId),
        readString(data.name),
        readString(data.displayName),
        readString(data.workspaceId),
        readString(data.websiteUrl),
        readString(data.deployUrl),
        readString(data.primaryDomain),
        readString(data.targetDomain),
        ...readStringArray(data.domains),
        ...vercelProjects,
        ...(workspaceAliasByClientId.get(doc.id) ?? []),
      ])

      return {
        id: doc.id,
        name: readString(data.name) || readString(data.displayName) || storyId,
        storyId,
        phoneReady: Boolean(readString(data.phone) || readString(data.smsPhone) || phoneReadyByClientId.get(doc.id)),
        aliases: unique(Array.from(aliases)),
        workspaceIds: unique([
          readString(data.workspaceId),
          ...(workspaceIdsByClientId.get(doc.id) ?? []),
        ]),
      }
    })
    .filter((entry) => entry.aliases.length > 0)
}

function matchClient(
  fileName: string,
  parsedSlug: string | null,
  clientSlugFilter: string,
  registry: ClientRegistryEntry[]
) {
  const normalizedFileName = slugify(fileName)
  const normalizedParsedSlug = parsedSlug ? slugify(parsedSlug) : ""
  const normalizedFilter = clientSlugFilter ? slugify(clientSlugFilter) : ""

  const candidates = registry.filter((entry) => {
    if (!normalizedFilter) return true
    return entry.aliases.includes(normalizedFilter) || slugify(entry.id) === normalizedFilter
  })

  if (normalizedParsedSlug) {
    const direct = candidates.find((entry) => entry.aliases.includes(normalizedParsedSlug))
    if (direct) return { client: direct, matchedAlias: normalizedParsedSlug }
  }

  const aliases = candidates.flatMap((entry) =>
    entry.aliases.map((alias) => ({ alias, entry }))
  )
  aliases.sort((a, b) => b.alias.length - a.alias.length)
  const matched = aliases.find(({ alias }) => alias.length >= 3 && normalizedFileName.includes(alias))
  return matched ? { client: matched.entry, matchedAlias: matched.alias } : null
}

async function driveToStorage(fileId: string, filename: string, token: string): Promise<string> {
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

async function countStatusVideos(clientId: string) {
  const snapshot = await getAdminDb()
    .collection("clients")
    .doc(clientId)
    .collection("statusVideos")
    .limit(20)
    .get()
    .catch(() => null)
  return snapshot?.size ?? 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get("dryRun") === "true"
  const sinceHours = Math.min(Math.max(Number(searchParams.get("sinceHours") ?? "25") || 25, 1), 24 * 14)
  const clientSlugFilter = readString(searchParams.get("clientSlug"))

  const cronSecret = process.env.CRON_SECRET
  if (dryRun) {
    if (!isInternalReadAuthorized(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
  } else {
    const hasCronSecret = Boolean(cronSecret) && req.headers.get("authorization") === `Bearer ${cronSecret}`
    if (!hasCronSecret && !isInternalMutationAuthorized(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
  }

  const missingConfig = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"].filter(
    (key) => !process.env[key]?.trim()
  )
  if (missingConfig.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        dryRun,
        error: `Missing Google Drive config: ${missingConfig.join(", ")}`,
        missingConfig,
      },
      { status: 500 }
    )
  }

  const db = getAdminDb()

  let token: string
  try {
    token = await getAccessToken()
  } catch {
    return NextResponse.json({ ok: false, dryRun, error: "Google auth failed - check GOOGLE_REFRESH_TOKEN" }, { status: 500 })
  }

  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
  const folderId = process.env.DRIVE_RECORDINGS_FOLDER_ID
  let q = `mimeType contains 'video/' and modifiedTime > '${since}'`
  if (folderId) {
    q += ` and '${folderId}' in parents`
  } else {
    q += ` and (name contains 'Meet Recording' or name contains 'RAG:' or name contains '_update_')`
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=25`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const searchData = await searchRes.json()
  if (!searchRes.ok) {
    return NextResponse.json(
      { ok: false, dryRun, error: searchData?.error?.message ?? `Drive search failed ${searchRes.status}` },
      { status: 500 }
    )
  }

  const files = (Array.isArray(searchData.files) ? searchData.files : []) as DriveFile[]
  const registry = await loadClientRegistry()
  const rows = []
  let processed = 0
  let skipped = 0
  let unmatched = 0

  for (const file of files) {
    const markerDocId = `drive_${file.id}`
    const marker = await db.collection("processedVideos").doc(markerDocId).get()
    const alreadyProcessed = marker.exists
    const parsed = parseFilename(file.name)
    const match = matchClient(file.name, parsed.parsedSlug, clientSlugFilter, registry)
    const clientSlug = match?.client.storyId || parsed.parsedSlug || ""
    const date = parsed.date
    const title = clientSlug ? buildTitle(clientSlug, date) : ""
    const statusVideoCount = match?.client ? await countStatusVideos(match.client.id) : 0
    const status = alreadyProcessed
      ? "already_processed"
      : match?.client
        ? "matched"
        : parsed.parsedSlug
          ? "unmatched_client"
          : "unmatched_name"

    if (alreadyProcessed) skipped++
    else if (!match?.client) unmatched++

    rows.push({
      driveFileId: file.id,
      name: file.name,
      modifiedTime: file.modifiedTime ?? null,
      size: file.size ?? null,
      parseMode: parsed.mode,
      parsedSlug: parsed.parsedSlug,
      matchedAlias: match?.matchedAlias ?? null,
      status,
      reason:
        status === "unmatched_name"
          ? "Filename does not include a supported client slug pattern."
          : status === "unmatched_client"
            ? `No client matched parsed slug "${parsed.parsedSlug}".`
            : status === "already_processed"
              ? "This Drive file already has a processedVideos marker."
              : null,
      client: match?.client
        ? {
            id: match.client.id,
            name: match.client.name,
            storyId: match.client.storyId,
            workspaceIds: match.client.workspaceIds,
            phoneReady: match.client.phoneReady,
            statusVideoCount,
          }
        : null,
      title,
      dryRun,
    })

    if (dryRun || alreadyProcessed || !match?.client) {
      if (!dryRun && !match?.client) {
        await db.collection("unprocessedDriveVideos").doc(file.id).set(
          {
            driveFileId: file.id,
            originalName: file.name,
            parsedSlug: parsed.parsedSlug,
            reason: "Cannot match client slug",
            suggestion: `Rename to: {clientslug}_update_${date}.mp4 or set Meet title to start with client name`,
            discoveredAt: new Date().toISOString(),
            status: "needs-rename",
          },
          { merge: true }
        )
      }
      continue
    }

    try {
      const storageFilename = `${match.client.storyId}_update_${date}.mp4`
      const storagePath = await driveToStorage(file.id, storageFilename, token)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://readyaimgo.biz"
      const processRes = await fetch(`${appUrl}/api/videos/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath,
          clientSlug: match.client.storyId,
          title,
          sendSms: searchParams.get("sendSms") !== "false",
        }),
      })
      const processData = await processRes.json()

      if (processData.success) {
        await db.collection("processedVideos").doc(markerDocId).set({
          driveFileId: file.id,
          originalName: file.name,
          clientSlug: match.client.storyId,
          title,
          storagePath,
          videoId: processData.videoId,
          processedAt: new Date().toISOString(),
          source: "google-drive",
        })
        processed++
      }
    } catch (error) {
      rows.push({
        driveFileId: file.id,
        name: file.name,
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
        dryRun,
      })
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    sinceHours,
    folderScoped: Boolean(folderId),
    processed,
    skipped,
    unmatched,
    total: files.length,
    clientsIndexed: registry.length,
    rows,
    message: files.length === 0 ? "No recent Drive recordings found." : undefined,
  })
}
