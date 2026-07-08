import { type NextRequest, NextResponse } from "next/server"

import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import {
  attachProjectToWorkspace,
  readAdminString,
  readAdminStringArray,
  safeProjectDocId,
} from "@/lib/admin/workspace-assets"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ workspaceId: string }> }

function repositorySlug(owner: string | null, name: string | null) {
  return owner && name ? `${owner}/${name}` : null
}

function normalizeProjectPayload(body: Record<string, unknown>) {
  const repositoryOwner = readAdminString(body.repositoryOwner)
  const repositoryName = readAdminString(body.repositoryName)
  const repoSlug =
    readAdminString(body.repoSlug) ||
    readAdminString(body.githubRepo) ||
    readAdminString(body.repositoryFullName) ||
    repositorySlug(repositoryOwner, repositoryName)
  const title = readAdminString(body.title) || readAdminString(body.name)
  const subtitles = readAdminStringArray(body.subtitles)
  const description =
    readAdminString(body.description) ||
    readAdminString(body.summary) ||
    subtitles.join("\n") ||
    null
  const vercelProjectSlug =
    readAdminString(body.vercelProjectSlug) ||
    readAdminString(body.vercelProjectName) ||
    readAdminString(body.vercelProjectId)

  return {
    title,
    name: title,
    summary: readAdminString(body.summary) || description,
    description,
    subtitles,
    repositoryOwner,
    repositoryName,
    repoSlug,
    githubRepo: repoSlug,
    repository:
      repoSlug || repositoryOwner || repositoryName
        ? {
            owner: repositoryOwner,
            name: repositoryName,
            fullName: repoSlug,
            url: repoSlug ? `https://github.com/${repoSlug}` : null,
          }
        : null,
    vercelProjectSlug,
    vercelProjectName: vercelProjectSlug,
    vercelProjectId: readAdminString(body.vercelProjectId) || vercelProjectSlug,
    status: readAdminString(body.status) || "active",
    projectType: readAdminString(body.projectType) || "webdev",
    assetProjectType: readAdminString(body.assetProjectType) || "webdev",
    updateVideoUrl: readAdminString(body.updateVideoUrl),
    videoTranscriptText: readAdminString(body.videoTranscriptText),
    contractEmailReferenceSource: readAdminString(body.contractEmailReferenceSource),
  }
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const id = decodeURIComponent(workspaceId)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const snapshot = await db
      .collection("projects")
      .where("workspaceId", "==", id)
      .limit(200)
      .get()

    return NextResponse.json({
      success: true,
      projects: snapshot.docs.map((doc) => serializeFirestoreDocument(doc.id, doc.data())),
    })
  } catch (error) {
    console.error("GET /api/admin/workspaces/[workspaceId]/projects:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const id = decodeURIComponent(workspaceId)
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const workspaceRef = db.collection("workspaces").doc(id)
    const workspaceSnap = await workspaceRef.get()
    if (!workspaceSnap.exists) {
      return NextResponse.json({ success: false, error: "Workspace not found." }, { status: 404 })
    }

    const workspace = workspaceSnap.data() as Record<string, unknown>
    const clientId = readAdminString(workspace.clientId)
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Workspace must be linked to a clientId before projects can be injected." },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const normalized = normalizeProjectPayload(body)
    if (!normalized.title) {
      return NextResponse.json(
        { success: false, error: "title or name is required." },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const requestedProjectId = readAdminString(body.projectId)
    const projectId = requestedProjectId
      ? safeProjectDocId(requestedProjectId)
      : safeProjectDocId(
          `${id}__admin__${normalized.repoSlug || normalized.vercelProjectSlug || normalized.title}`
        )

    const payload = {
      ...normalized,
      id: projectId,
      workspaceId: id,
      workspaceSlug: id,
      clientId,
      source: "admin-workspace-injection",
      sourceSystem: "readyaimgo-admin",
      createdAt: now,
      updatedAt: now,
    }

    await db.collection("projects").doc(projectId).set(payload, { merge: true })
    await attachProjectToWorkspace(db, id, projectId)

    await writeAuditLog({
      collection: "projects",
      docId: projectId,
      action: "create",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: {
        operation: "inject-workspace-project",
        workspaceId: id,
        workspaceSlug: id,
        clientId,
        title: normalized.title,
        repoSlug: normalized.repoSlug,
        vercelProjectSlug: normalized.vercelProjectSlug,
      },
    })

    return NextResponse.json({ success: true, project: payload })
  } catch (error) {
    console.error("POST /api/admin/workspaces/[workspaceId]/projects:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
