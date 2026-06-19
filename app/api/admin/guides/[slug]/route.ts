import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "octokit"

import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import {
  GUIDES_DIR,
  getGuidesBranch,
  getGuidesRepo,
  parseFrontmatter,
  serializeGuide,
  toGuideMeta,
} from "@/lib/admin/guides"
import { readLocalGuide, useLocalGuides } from "@/lib/admin/guides-local"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ slug: string }> }

function getToken(): string | null {
  return process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT || null
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/** Fetch a guide file's decoded content + sha, or null when missing. */
async function fetchGuideFile(octokit: Octokit, path: string, ref: string) {
  try {
    const { data } = await octokit.rest.repos.getContent({ ...getGuidesRepo(), path, ref })
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) return null
    return { raw: Buffer.from(data.content, "base64").toString("utf-8"), sha: data.sha }
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null
    throw err
  }
}

// GET /api/admin/guides/[slug] — read a single guide (frontmatter + body + sha).
export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  const { slug } = await context.params

  // Development: read from disk so unpushed guides are visible (no token needed).
  if (useLocalGuides) {
    const local = await readLocalGuide(slug)
    if (local) return NextResponse.json({ success: true, guide: local })
    // fall through to GitHub if not found locally
  }

  const token = getToken()
  if (!token) {
    return NextResponse.json({ success: false, error: "GITHUB_TOKEN is not configured." }, { status: 500 })
  }

  const octokit = new Octokit({ auth: token })
  const path = `${GUIDES_DIR}/${slug}.md`

  try {
    const file = await fetchGuideFile(octokit, path, getGuidesBranch())
    if (!file) return NextResponse.json({ success: false, error: "Guide not found" }, { status: 404 })

    const { data: fm, body } = parseFrontmatter(file.raw)
    return NextResponse.json({
      success: true,
      guide: { ...toGuideMeta(slug, fm), body, sha: file.sha },
    })
  } catch (err) {
    console.error("GET /api/admin/guides/[slug]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unable to load guide." },
      { status: 500 }
    )
  }
}

// PUT /api/admin/guides/[slug] — update a guide (commits the markdown file).
export async function PUT(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  const token = getToken()
  if (!token) {
    return NextResponse.json({ success: false, error: "GITHUB_TOKEN is not configured." }, { status: 500 })
  }

  const { slug } = await context.params
  const octokit = new Octokit({ auth: token })
  const { owner, repo } = getGuidesRepo()
  const branch = getGuidesBranch()
  const path = `${GUIDES_DIR}/${slug}.md`

  try {
    const existing = await fetchGuideFile(octokit, path, branch)
    if (!existing) return NextResponse.json({ success: false, error: "Guide not found" }, { status: 404 })

    const current = parseFrontmatter(existing.raw)
    const currentMeta = toGuideMeta(slug, current.data)
    const body = (await request.json()) as Record<string, unknown>

    const markdown = serializeGuide(
      {
        title: readString(body.title) || currentMeta.title,
        category: readString(body.category) || currentMeta.category,
        summary: typeof body.summary === "string" ? body.summary.trim() : currentMeta.summary,
        order: typeof body.order === "number" ? body.order : currentMeta.order,
        video: typeof body.video === "string" ? body.video.trim() : currentMeta.video,
      },
      typeof body.content === "string" ? body.content : current.body
    )

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      branch,
      message: `docs(guides): update "${readString(body.title) || currentMeta.title}"`,
      content: Buffer.from(markdown, "utf-8").toString("base64"),
      sha: existing.sha,
    })

    return NextResponse.json({ success: true, slug })
  } catch (err) {
    console.error("PUT /api/admin/guides/[slug]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unable to update guide." },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/guides/[slug] — remove the guide file.
export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  const token = getToken()
  if (!token) {
    return NextResponse.json({ success: false, error: "GITHUB_TOKEN is not configured." }, { status: 500 })
  }

  const { slug } = await context.params
  const octokit = new Octokit({ auth: token })
  const { owner, repo } = getGuidesRepo()
  const branch = getGuidesBranch()
  const path = `${GUIDES_DIR}/${slug}.md`

  try {
    const existing = await fetchGuideFile(octokit, path, branch)
    if (!existing) return NextResponse.json({ success: false, error: "Guide not found" }, { status: 404 })

    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path,
      branch,
      message: `docs(guides): remove "${slug}"`,
      sha: existing.sha,
    })

    return NextResponse.json({ success: true, slug })
  } catch (err) {
    console.error("DELETE /api/admin/guides/[slug]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unable to delete guide." },
      { status: 500 }
    )
  }
}
