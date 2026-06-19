// Server-only filesystem reads for guides, used as a development fallback so
// locally-authored guide files show up before they're committed/pushed. In
// production the API routes read from GitHub instead (the repo is canonical and
// serverless runtimes don't reliably include untraced files). Writes always go
// through the GitHub Contents API regardless of environment.

import { promises as fs } from "fs"
import path from "path"

import {
  GUIDES_DIR,
  parseFrontmatter,
  toGuideMeta,
  type GuideDoc,
  type GuideMeta,
} from "@/lib/admin/guides"

/** True when we should prefer local files (i.e. not a production build). */
export const useLocalGuides = process.env.NODE_ENV !== "production"

function guidesDirPath(): string {
  return path.join(process.cwd(), GUIDES_DIR)
}

export async function listLocalGuides(): Promise<GuideMeta[]> {
  let names: string[]
  try {
    names = await fs.readdir(guidesDirPath())
  } catch {
    return []
  }

  const guides: GuideMeta[] = []
  for (const name of names) {
    if (!name.endsWith(".md")) continue
    try {
      const raw = await fs.readFile(path.join(guidesDirPath(), name), "utf-8")
      const { data } = parseFrontmatter(raw)
      guides.push(toGuideMeta(name.replace(/\.md$/, ""), data))
    } catch {
      // skip unreadable file
    }
  }
  guides.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
  return guides
}

export async function readLocalGuide(slug: string): Promise<GuideDoc | null> {
  // Guard against path traversal via the slug.
  if (!/^[a-z0-9-]+$/i.test(slug)) return null
  try {
    const raw = await fs.readFile(path.join(guidesDirPath(), `${slug}.md`), "utf-8")
    const { data, body } = parseFrontmatter(raw)
    // No GitHub blob SHA locally; edits require the guide to be pushed first.
    return { ...toGuideMeta(slug, data), body, sha: "" }
  } catch {
    return null
  }
}
