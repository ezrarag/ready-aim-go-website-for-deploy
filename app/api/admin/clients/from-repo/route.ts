import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"

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

/**
 * POST /api/admin/clients/from-repo
 *
 * Creates a new client seeded from a GitHub repository and wires the connections
 * so workspace ↔ client ↔ repo are linked:
 *   1. clients/{id}        — the new client (name + slug derived from the repo)
 *   2. repos/{id}          — links the repo to the client
 *   3. workspaces/{id}     — a workspace owned by the client (githubOrg = repo owner)
 *
 * Body: { repoFullName, repoId?, htmlUrl?, name? }
 * Returns: { success, clientId, workspaceId, repoId }
 */
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const repoFullName = readString(body.repoFullName)
    if (!repoFullName || !repoFullName.includes("/")) {
      return NextResponse.json(
        { success: false, error: "repoFullName (owner/repo) is required" },
        { status: 400 }
      )
    }

    const [owner, repoShort = ""] = repoFullName.split("/")
    const htmlUrl = readString(body.htmlUrl) || `https://github.com/${repoFullName}`
    const slug = slugify(repoShort) || slugify(repoFullName)
    const name = readString(body.name) || humanize(repoShort || repoFullName)
    const now = new Date().toISOString()

    // 1. Client document
    const clientPayload = {
      recordType: "relationship",
      name,
      storyId: slug,
      status: "onboarding",
      sourceRepo: repoFullName,
      showOnFrontend: false,
      createdAt: now,
      updatedAt: now,
    }
    const clientRef = await db.collection("clients").add(clientPayload)

    // 3. Workspace document (created before the repo link so we can cross-reference it)
    const workspacePayload = {
      name,
      clientId: clientRef.id,
      githubOrg: owner,
      createdAt: now,
      updatedAt: now,
    }
    const workspaceRef = await db.collection("workspaces").add(workspacePayload)

    // 2. Repo link
    const repoPayload = {
      clientId: clientRef.id,
      workspaceId: workspaceRef.id,
      repoSlug: repoFullName,
      htmlUrl,
      githubRepoId: typeof body.repoId === "number" ? body.repoId : null,
      createdAt: now,
      updatedAt: now,
    }
    const repoRef = await db.collection("repos").add(repoPayload)

    // Backlink the workspace onto the client for the admin hub.
    await clientRef.update({ workspaceId: workspaceRef.id, updatedAt: now })

    await writeAuditLog({
      collection: "clients",
      docId: clientRef.id,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { name, sourceRepo: repoFullName },
    })

    return NextResponse.json({
      success: true,
      clientId: clientRef.id,
      workspaceId: workspaceRef.id,
      repoId: repoRef.id,
    })
  } catch (err) {
    console.error("POST /api/admin/clients/from-repo:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
