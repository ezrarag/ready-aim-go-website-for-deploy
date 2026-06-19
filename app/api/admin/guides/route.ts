import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "octokit"

import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import {
  GUIDES_DIR,
  getGuidesBranch,
  getGuidesRepo,
  parseFrontmatter,
  serializeGuide,
  slugifyGuide,
  toGuideMeta,
  type GuideMeta,
} from "@/lib/admin/guides"
import { listLocalGuides, useLocalGuides } from "@/lib/admin/guides-local"

export const dynamic = "force-dynamic"

function getToken(): string | null {
  return process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT || null
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

// GET /api/admin/guides — list all guides (metadata only).
export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // In development, read guides straight from disk so locally-authored files
  // show up before they're pushed. Production reads from GitHub.
  if (useLocalGuides) {
    try {
      return NextResponse.json({ success: true, guides: await listLocalGuides() })
    } catch (err) {
      console.error("GET /api/admin/guides (local):", err)
    }
  }

  const token = getToken()
  if (!token) {
    return NextResponse.json({ success: false, error: "GITHUB_TOKEN is not configured." }, { status: 500 })
  }

  const octokit = new Octokit({ auth: token })
  const { owner, repo } = getGuidesRepo()
  const ref = getGuidesBranch()

  try {
    let entries: Array<{ name: string; path: string }>
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path: GUIDES_DIR, ref })
      entries = Array.isArray(data)
        ? data.filter((item) => item.type === "file" && item.name.endsWith(".md"))
        : []
    } catch (err) {
      // Directory not created yet → no guides.
      if ((err as { status?: number }).status === 404) {
        return NextResponse.json({ success: true, guides: [] })
      }
      throw err
    }

    const guides: GuideMeta[] = []
    for (const entry of entries) {
      const { data: file } = await octokit.rest.repos.getContent({ owner, repo, path: entry.path, ref })
      if (Array.isArray(file) || file.type !== "file" || !("content" in file)) continue
      const raw = Buffer.from(file.content, "base64").toString("utf-8")
      const { data: fm } = parseFrontmatter(raw)
      guides.push(toGuideMeta(entry.name.replace(/\.md$/, ""), fm))
    }

    guides.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    return NextResponse.json({ success: true, guides })
  } catch (err) {
    console.error("GET /api/admin/guides:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unable to load guides." },
      { status: 500 }
    )
  }
}

// POST /api/admin/guides — create a new guide (commits a markdown file).
export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const token = getToken()
  if (!token) {
    return NextResponse.json({ success: false, error: "GITHUB_TOKEN is not configured." }, { status: 500 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const title = readString(body.title)
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 })
    }
    const slug = slugifyGuide(readString(body.slug) || title)
    if (!slug) {
      return NextResponse.json({ success: false, error: "Could not derive a slug from the title." }, { status: 400 })
    }

    const octokit = new Octokit({ auth: token })
    const { owner, repo } = getGuidesRepo()
    const branch = getGuidesBranch()
    const path = `${GUIDES_DIR}/${slug}.md`

    // Refuse to clobber an existing guide — edits go through PUT.
    try {
      await octokit.rest.repos.getContent({ owner, repo, path, ref: branch })
      return NextResponse.json(
        { success: false, error: `A guide with slug "${slug}" already exists.` },
        { status: 409 }
      )
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err
    }

    const markdown = serializeGuide(
      {
        title,
        category: readString(body.category) || "General",
        summary: readString(body.summary),
        order: typeof body.order === "number" ? body.order : 100,
        video: readString(body.video),
      },
      readString(body.content)
    )

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      branch,
      message: `docs(guides): add "${title}"`,
      content: Buffer.from(markdown, "utf-8").toString("base64"),
    })

    return NextResponse.json({ success: true, slug })
  } catch (err) {
    console.error("POST /api/admin/guides:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unable to create guide." },
      { status: 500 }
    )
  }
}
