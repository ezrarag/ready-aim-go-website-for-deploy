import { type NextRequest, NextResponse } from "next/server"
import { Octokit } from "octokit"

import { getFirestoreDb } from "@/lib/firestore"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { parseRepoSlug } from "@/lib/pulse-selectors"

export const dynamic = "force-dynamic"

type AdminGitHubRepo = {
  id: number
  fullName: string
  htmlUrl: string
  description: string | null
  language: string | null
  private: boolean
  updatedAt: string | null
  alreadyConnected?: boolean
  connectedClientId?: string | null
  connectedClientName?: string | null
}

function mapRepo(repo: {
  id: number
  full_name: string
  html_url: string
  description: string | null
  language?: string | null
  private: boolean
  updated_at?: string | null
}): AdminGitHubRepo {
  return {
    id: repo.id,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    description: repo.description,
    language: repo.language ?? null,
    private: repo.private,
    updatedAt: repo.updated_at ?? null,
  }
}

/**
 * GET /api/admin/github-repos
 *
 * Lists GitHub repositories for the configured org so an admin can connect a repo
 * to a (new) client. Mirrors the workspace repo-picker on the client portal, but
 * scoped to admin internal-auth (same-origin or READYAIMGO_INTERNAL_API_KEY).
 *
 * Query params:
 *   - owner:  override the org/user (defaults to GITHUB_ORG)
 *   - search: case-insensitive filter on fullName/description
 *   - page:   1-based page (per_page is fixed at 100)
 *
 * Resolution order: org repos → user repos → authenticated-user repos.
 */
export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const token =
    process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_PAT
  if (!token) {
    return NextResponse.json(
      { success: false, error: "GitHub token is not configured (GITHUB_TOKEN)." },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const owner = (searchParams.get("owner") || process.env.GITHUB_ORG || "").trim()
  const search = (searchParams.get("search") || "").trim().toLowerCase()
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1)
  const includeConnected = searchParams.get("includeConnected") === "true"

  const octokit = new Octokit({ auth: token })

  let repos: AdminGitHubRepo[] = []
  let source: "org" | "user" | "authed-user" = "authed-user"

  try {
    if (owner) {
      try {
        const { data } = await octokit.rest.repos.listForOrg({
          org: owner,
          per_page: 100,
          page,
          sort: "updated",
          type: "all",
        })
        repos = data.map(mapRepo)
        source = "org"
      } catch {
        const { data } = await octokit.rest.repos.listForUser({
          username: owner,
          per_page: 100,
          page,
          sort: "updated",
          type: "owner",
        })
        repos = data.map(mapRepo)
        source = "user"
      }
    } else {
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        page,
        sort: "updated",
        affiliation: "owner,collaborator,organization_member",
      })
      repos = data.map(mapRepo)
      source = "authed-user"
    }
  } catch (err) {
    const status =
      typeof (err as { status?: unknown }).status === "number"
        ? (err as { status: number }).status
        : 502
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unable to load GitHub repositories.",
      },
      { status }
    )
  }

  const filtered = search
    ? repos.filter(
        (repo) =>
          repo.fullName.toLowerCase().includes(search) ||
          (repo.description ?? "").toLowerCase().includes(search)
      )
    : repos

  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })
  }

  const [clientsSnap, repoLinksSnap] = await Promise.all([
    db.collection("clients").limit(500).get(),
    db.collection("repos").limit(1000).get(),
  ])

  const connectedRepoMap = new Map<string, { clientId: string | null; clientName: string | null }>()

  for (const doc of clientsSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    if (data.status === "archived") continue
    const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : null
    const repoValues = [
      typeof data.sourceRepo === "string" ? data.sourceRepo : "",
      typeof data.githubRepo === "string" ? data.githubRepo : "",
      ...(Array.isArray(data.githubRepos) ? data.githubRepos.filter((item): item is string => typeof item === "string") : []),
    ]

    for (const repoValue of repoValues) {
      const slug = parseRepoSlug(repoValue)
      if (!slug || connectedRepoMap.has(slug)) continue
      connectedRepoMap.set(slug, { clientId: doc.id, clientName: name })
    }
  }

  for (const doc of repoLinksSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    const slug = parseRepoSlug(typeof data.repoSlug === "string" ? data.repoSlug : "")
    if (!slug || connectedRepoMap.has(slug)) continue
    connectedRepoMap.set(slug, {
      clientId: typeof data.clientId === "string" && data.clientId.trim() ? data.clientId.trim() : null,
      clientName: null,
    })
  }

  const enriched = filtered.map((repo) => {
    const connection = connectedRepoMap.get(parseRepoSlug(repo.fullName) || "")
    return {
      ...repo,
      alreadyConnected: Boolean(connection),
      connectedClientId: connection?.clientId ?? null,
      connectedClientName: connection?.clientName ?? null,
    }
  })

  return NextResponse.json({
    success: true,
    owner: owner || null,
    source,
    page,
    repos: includeConnected ? enriched : enriched.filter((repo) => !repo.alreadyConnected),
  })
}
