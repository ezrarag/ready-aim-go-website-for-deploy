import { type NextRequest, NextResponse } from "next/server"

import type { ModuleKey } from "@/lib/client-directory"
import { getAdminDb } from "@/lib/firebase/admin"
import { getSuggestedWorkspacePublicUrl } from "@/lib/admin/workspace-frontend"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { parseRepoSlug } from "@/lib/pulse-selectors"

export const dynamic = "force-dynamic"

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === "string") return value
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return new Date().toISOString()
}

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const snapshot = await db
      .collection("workspaces")
      .orderBy("updatedAt", "desc")
      .limit(200)
      .get()

    const workspaces = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as Record<string, unknown>

        const repos = Array.isArray(data.repos)
          ? (data.repos as Array<Record<string, unknown>>).map((r) => ({
              id: typeof r.id === "number" ? r.id : 0,
              fullName: typeof r.fullName === "string" ? r.fullName : "",
              url: typeof r.url === "string" ? r.url : "",
              language: typeof r.language === "string" ? r.language : null,
            }))
          : []

        const vercelProjects = Array.isArray(data.vercelProjects)
          ? (data.vercelProjects as Array<Record<string, unknown>>).map((p) => ({
              id: typeof p.id === "string" ? p.id : "",
              name: typeof p.name === "string" ? p.name : "",
              url: typeof p.url === "string" ? p.url : null,
            }))
          : []

        return {
          id: doc.id,
          slug: doc.id,
          name: typeof data.name === "string" ? data.name : "",
          clientId: typeof data.clientId === "string" ? data.clientId : null,
          ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
          showOnFrontend: data.showOnFrontend === true,
          publicUrl: typeof data.publicUrl === "string" ? data.publicUrl : null,
          previewImageUrl: typeof data.previewImageUrl === "string" ? data.previewImageUrl : null,
          suggestedPublicUrl: getSuggestedWorkspacePublicUrl(data),
          frontEndProducts: Array.isArray(data.frontEndProducts)
            ? data.frontEndProducts.filter((item): item is ModuleKey => typeof item === "string")
            : [],
          frontEndTags: Array.isArray(data.frontEndTags)
            ? data.frontEndTags.filter((item): item is string => typeof item === "string")
            : [],
          repoCount: repos.length,
          vercelCount: vercelProjects.length,
          memberCount: typeof data.memberCount === "number" ? data.memberCount : 0,
          repos,
          vercelProjects,
          updatedAt: toIso(data.updatedAt),
        }
      })
    )

    return NextResponse.json({ success: true, workspaces })
  } catch (error) {
    console.error("GET /api/admin/workspaces error:", error)
    return NextResponse.json({ error: "Unable to load workspaces." }, { status: 500 })
  }
}

/**
 * POST /api/admin/workspaces
 *
 * Creates a workspace record, primarily for external tools (e.g. raCommand)
 * that already ran their own local git-clone + Codex-thread setup and are
 * pushing that workspace into the admin system of record.
 *
 * Body: { name: string, clientId?: string, repoUrl?: string, tags?: string[], source?: string }
 * Returns: { success, workspace: { id, slug, name, clientId, repoSlug } }
 */
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const name = readString(body.name)
    if (!name) {
      return NextResponse.json({ success: false, error: "name is required." }, { status: 400 })
    }

    const clientId = readString(body.clientId) || null
    const repoUrl = readString(body.repoUrl)
    const repoSlug = repoUrl ? parseRepoSlug(repoUrl) : null
    const tags = readStringArray(body.tags)
    const source = readString(body.source) || "racommand"

    const now = new Date().toISOString()
    const workspacePayload = {
      name,
      clientId,
      githubOrg: repoSlug ? repoSlug.split("/")[0] : null,
      showOnFrontend: false,
      frontEndProducts: [] as string[],
      frontEndTags: tags,
      repos: [] as unknown[],
      source,
      createdAt: now,
      updatedAt: now,
    }

    const workspaceRef = await db.collection("workspaces").add(workspacePayload)

    if (repoSlug) {
      const existingRepoSnap = await db
        .collection("repos")
        .where("repoSlug", "==", repoSlug)
        .limit(1)
        .get()

      const repoPayload = {
        clientId,
        workspaceId: workspaceRef.id,
        repoSlug,
        htmlUrl: repoUrl,
        updatedAt: now,
      }

      if (!existingRepoSnap.empty) {
        await existingRepoSnap.docs[0].ref.set(repoPayload, { merge: true })
      } else {
        await db.collection("repos").add({ ...repoPayload, createdAt: now })
      }
    }

    await writeAuditLog({
      collection: "workspaces",
      docId: workspaceRef.id,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: { name, clientId, repoSlug, source },
    })

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspaceRef.id,
        slug: workspaceRef.id,
        name,
        clientId,
        repoSlug,
      },
    })
  } catch (error) {
    console.error("POST /api/admin/workspaces error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to create workspace." },
      { status: 500 }
    )
  }
}
