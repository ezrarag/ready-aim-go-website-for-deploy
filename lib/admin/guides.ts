// Shared helpers for the admin Guides ("How-to / guidelines") section.
//
// Guides are markdown files stored in the repo under `content/guides/*.md`, so
// the repo stays the single source of truth: Codex/Claude edit the files on
// disk, and the admin UI edits them by committing back through the GitHub
// Contents API. This module holds the pure (non-network) pieces — coordinates,
// frontmatter parsing/serialization, and types — shared by the API routes.

export const GUIDES_DIR = "content/guides"

export type GuideMeta = {
  slug: string
  title: string
  category: string
  summary: string
  order: number
  /** Optional path/URL to an embedded how-to composition (e.g. a HyperFrames HTML file). */
  video: string
}

export type GuideDoc = GuideMeta & {
  body: string
  /** GitHub blob SHA — required to update or delete the file. */
  sha: string
}

/** owner/repo where guides live. Defaults to this repo. */
export function getGuidesRepo(): { owner: string; repo: string } {
  const full = process.env.GITHUB_GUIDES_REPO || "ezrarag/ready-aim-go-website-for-deploy"
  const [owner, repo] = full.split("/")
  return { owner, repo: repo || "ready-aim-go-website-for-deploy" }
}

export function getGuidesBranch(): string {
  return process.env.GITHUB_GUIDES_BRANCH || "main"
}

/** Reduce arbitrary text to a safe kebab-case slug usable as a filename. */
export function slugifyGuide(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?/

/**
 * Parse a minimal `key: value` frontmatter block. Values may be wrapped in
 * single or double quotes. Returns the data map and the remaining body.
 */
export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) return { data: {}, body: raw }

  const data: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) data[key] = value
  }
  return { data, body: raw.slice(match[0].length) }
}

/** Build a guide's full markdown (frontmatter + body) from fields. */
export function serializeGuide(
  meta: Omit<GuideMeta, "slug">,
  body: string
): string {
  const esc = (v: string) => (/[:#]/.test(v) ? JSON.stringify(v) : v)
  const lines = [
    "---",
    `title: ${esc(meta.title)}`,
    `category: ${esc(meta.category)}`,
    `summary: ${esc(meta.summary)}`,
    `order: ${meta.order}`,
    `video: ${meta.video}`,
    "---",
    "",
  ]
  return `${lines.join("\n")}${body.trim()}\n`
}

/** Turn a parsed file into a typed GuideMeta. */
export function toGuideMeta(slug: string, data: Record<string, string>): GuideMeta {
  return {
    slug,
    title: data.title?.trim() || slug,
    category: data.category?.trim() || "General",
    summary: data.summary?.trim() || "",
    order: Number.parseInt(data.order ?? "", 10) || 0,
    video: data.video?.trim() || "",
  }
}
