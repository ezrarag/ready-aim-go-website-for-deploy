import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { parseRepoSlug } from "@/lib/pulse-selectors"

export const dynamic = "force-dynamic"

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function humanize(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

type RepoCreateInput = {
  repoFullName: string
  repoId?: number | null
  htmlUrl?: string
  name?: string
}

async function collectExistingRepoSlugs(db: NonNullable<ReturnType<typeof getFirestoreDb>>) {
  const [clientsSnap, reposSnap] = await Promise.all([
    db.collection("clients").limit(500).get(),
    db.collection("repos").limit(1000).get(),
  ])

  const existing = new Set<string>()

  for (const doc of clientsSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    if (data.status === "archived") continue
    const repoValues = [
      typeof data.sourceRepo === "string" ? data.sourceRepo : "",
      typeof data.githubRepo === "string" ? data.githubRepo : "",
      ...(Array.isArray(data.githubRepos) ? data.githubRepos.filter((item): item is string => typeof item === "string") : []),
    ]
    for (const value of repoValues) {
      const slug = parseRepoSlug(value)
      if (slug) existing.add(slug)
    }
  }

  for (const doc of reposSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    const slug = parseRepoSlug(typeof data.repoSlug === "string" ? data.repoSlug : "")
    if (slug) existing.add(slug)
  }

  return existing
}

/**
 * POST /api/admin/clients/from-repo
 *
 * Creates a new client seeded from a GitHub repository and wires the connections
 * so workspace ↔ client ↔ repo are linked:
 *   1. clients/{id}        — the new client (name + slug derived from the repo)
 *   2. repos/{id}          — links the repo to the client
 *   3. workspaces/{id}     — a workspace owned by the client (githubOrg = repo owner)
 *
 * Body: { repoFullName, repoId?, htmlUrl?, name? } or { repos: [...] }
 * Returns: { success, created, skipped, clientId?, workspaceId?, repoId? }
 */
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const now = new Date().toISOString()
    const body = (await request.json()) as Record<string, unknown>
    const requestedRepos = Array.isArray(body.repos)
      ? body.repos
      : [body]
    const inputs = requestedRepos
      .map((item) => (item && typeof item === "object" ? item as RepoCreateInput : null))
      .filter((item): item is RepoCreateInput => Boolean(item))

    if (inputs.length === 0) {
      return NextResponse.json({ success: false, error: "At least one repo is required." }, { status: 400 })
    }

    const existingRepoSlugs = await collectExistingRepoSlugs(db)
    const created: Array<{ repoFullName: string; clientId: string; workspaceId: string; repoId: string }> = []
    const skipped: Array<{ repoFullName: string; reason: string }> = []

    for (const input of inputs) {
      const repoFullName = readString(input.repoFullName)
      if (!repoFullName || !repoFullName.includes("/")) {
        skipped.push({ repoFullName: repoFullName || "(missing repo)", reason: "Invalid repoFullName" })
        continue
      }

      const normalizedRepoSlug = parseRepoSlug(repoFullName)
      if (!normalizedRepoSlug) {
        skipped.push({ repoFullName, reason: "Invalid GitHub repo slug" })
        continue
      }
      if (existingRepoSlugs.has(normalizedRepoSlug)) {
        skipped.push({ repoFullName, reason: "Repo already connected" })
        continue
      }

      const [owner, repoShort = ""] = repoFullName.split("/")
      const htmlUrl = readString(input.htmlUrl) || `https://github.com/${repoFullName}`
      const slug = slugify(repoShort) || slugify(repoFullName)
      const name = readString(input.name) || humanize(repoShort || repoFullName)

      const clientPayload = {
        recordType: "relationship",
        name,
        storyId: slug,
        status: "onboarding",
        sourceRepo: normalizedRepoSlug,
        githubRepo: normalizedRepoSlug,
        githubRepos: [normalizedRepoSlug],
        showOnFrontend: false,
        createdAt: now,
        updatedAt: now,
      }
      const clientRef = await db.collection("clients").add(clientPayload)

      const workspacePayload = {
        name,
        clientId: clientRef.id,
        githubOrg: owner,
        createdAt: now,
        updatedAt: now,
      }
      const workspaceRef = await db.collection("workspaces").add(workspacePayload)

      const repoPayload = {
        clientId: clientRef.id,
        workspaceId: workspaceRef.id,
        repoSlug: normalizedRepoSlug,
        htmlUrl,
        githubRepoId: typeof input.repoId === "number" ? input.repoId : null,
        createdAt: now,
        updatedAt: now,
      }
      const repoRef = await db.collection("repos").add(repoPayload)

      await clientRef.update({ workspaceId: workspaceRef.id, updatedAt: now })
      existingRepoSlugs.add(normalizedRepoSlug)

      await writeAuditLog({
        collection: "clients",
        docId: clientRef.id,
        action: "create",
        actorKey: extractActorKey(request.headers.get("authorization")),
        payload: { name, sourceRepo: normalizedRepoSlug },
      })

      created.push({
        repoFullName: normalizedRepoSlug,
        clientId: clientRef.id,
        workspaceId: workspaceRef.id,
        repoId: repoRef.id,
      })
    }

    if (created.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: skipped[0]?.reason || "No clients were created.",
          skipped,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      clientId: created[0]?.clientId,
      workspaceId: created[0]?.workspaceId,
      repoId: created[0]?.repoId,
      created,
      skipped,
    })
  } catch (err) {
    console.error("POST /api/admin/clients/from-repo:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
