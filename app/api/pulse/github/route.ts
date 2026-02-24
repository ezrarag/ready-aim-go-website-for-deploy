import { NextRequest, NextResponse } from "next/server"
import { parseRepoSelectorsFromSearchParams, parseRepoSlug } from "@/lib/pulse-selectors"

type PulseEvent = {
  source: "github"
  timestamp: string
  data: Record<string, unknown>
  project?: string
}

type GitHubCommit = {
  sha: string
  html_url: string
  commit: {
    message: string
    author: {
      name?: string
      email?: string
      date?: string
    }
  }
  author?: {
    login?: string
    avatar_url?: string
  } | null
}

type GitHubIssue = {
  number: number
  title: string
  html_url: string
  state: string
  created_at: string
  updated_at: string
  user?: {
    login?: string
  }
  pull_request?: unknown
}

type GitHubPullRequest = {
  number: number
  title: string
  html_url: string
  state: string
  created_at: string
  updated_at: string
  user?: {
    login?: string
  }
  draft?: boolean
}

async function fetchGitHub<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ReadyAimGo-Pulse",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    return null
  }

  return (await res.json()) as T
}

function reposFromEnv(): string[] {
  const raw = process.env.GITHUB_DEFAULT_REPOS ?? ""
  return raw
    .split(",")
    .map((v) => v.trim())
    .map((v) => parseRepoSlug(v))
    .filter((v): v is string => Boolean(v))
}

function extractProjectFromText(text: string, fallbackRepoName: string): string {
  const lowerMessage = text.toLowerCase()
  const keywords = ["femi", "baya", "jennalyn", "beam", "stripe", "dashboard", "api"]
  for (const keyword of keywords) {
    if (lowerMessage.includes(keyword)) return keyword
  }
  return fallbackRepoName.toLowerCase()
}

export async function GET(req: NextRequest) {
  try {
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json({
        events: [],
        source: "github",
        totalEvents: 0,
        repos: [],
        error: "GitHub token not configured",
      })
    }

    const requestedRepos = parseRepoSelectorsFromSearchParams(req.nextUrl.searchParams)
    const repos = requestedRepos.length > 0 ? requestedRepos : reposFromEnv()

    if (repos.length === 0) {
      return NextResponse.json({
        events: [],
        source: "github",
        totalEvents: 0,
        repos: [],
        error: "No repositories provided. Use ?repo=owner/name (repeatable) or ?repos=owner/a,owner/b",
      })
    }

    const events: PulseEvent[] = []

    await Promise.all(
      repos.map(async (slug) => {
        const [owner, repo] = slug.split("/")
        const base = `https://api.github.com/repos/${owner}/${repo}`

        const [commits, issues, pulls] = await Promise.all([
          fetchGitHub<GitHubCommit[]>(`${base}/commits?per_page=10`, githubToken),
          fetchGitHub<GitHubIssue[]>(`${base}/issues?state=open&per_page=10`, githubToken),
          fetchGitHub<GitHubPullRequest[]>(`${base}/pulls?state=open&per_page=10`, githubToken),
        ])

        for (const commit of commits ?? []) {
          const timestamp = commit.commit.author?.date ?? new Date().toISOString()
          events.push({
            source: "github",
            timestamp,
            project: extractProjectFromText(commit.commit.message, repo),
            data: {
              type: "commit",
              repo: slug,
              message: commit.commit.message,
              author: commit.author?.login ?? commit.commit.author?.name ?? "unknown",
              authorName: commit.commit.author?.name ?? null,
              avatar: commit.author?.avatar_url ?? null,
              url: commit.html_url,
              sha: commit.sha.substring(0, 7),
            },
          })
        }

        for (const issue of issues ?? []) {
          if (issue.pull_request) continue
          events.push({
            source: "github",
            timestamp: issue.updated_at || issue.created_at,
            project: repo,
            data: {
              type: "issue",
              repo: slug,
              number: issue.number,
              title: issue.title,
              state: issue.state,
              author: issue.user?.login ?? "unknown",
              url: issue.html_url,
              createdAt: issue.created_at,
              updatedAt: issue.updated_at,
            },
          })
        }

        for (const pr of pulls ?? []) {
          events.push({
            source: "github",
            timestamp: pr.updated_at || pr.created_at,
            project: repo,
            data: {
              type: "pull_request",
              repo: slug,
              number: pr.number,
              title: pr.title,
              state: pr.state,
              author: pr.user?.login ?? "unknown",
              url: pr.html_url,
              draft: Boolean(pr.draft),
              createdAt: pr.created_at,
              updatedAt: pr.updated_at,
            },
          })
        }
      })
    )

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      events: events.slice(0, 200),
      source: "github",
      totalEvents: events.length,
      repos,
    })
  } catch (error) {
    console.error("GitHub Pulse API error:", error)
    return NextResponse.json(
      {
        events: [],
        source: "github",
        totalEvents: 0,
        repos: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
