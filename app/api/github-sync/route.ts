import { NextRequest, NextResponse } from "next/server"
import { Octokit } from "octokit"

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

async function fetchTodoMdFromGitHub(repo: string) {
  try {
    const [owner, repoName] = repo.split("/")
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path: "TODO.md",
    })
    const content = Buffer.from((data as { content?: string }).content ?? "", "base64").toString("utf-8")
    return content
  } catch {
    return null
  }
}

/** TODO: sync parsed TODO lines to Firestore `client_todos` */
async function parseAndSyncTodos(_clientId: string, _todoContent: string) {
  /* Firestore migration pending */
}

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get("x-github-event")
    if (event !== "push") {
      return NextResponse.json({ message: "Not a push event, ignoring." }, { status: 200 })
    }
    const payload = await req.json()
    const modifiedFiles = [
      ...(payload.head_commit?.added || []),
      ...(payload.head_commit?.modified || []),
      ...(payload.head_commit?.removed || []),
    ]
    if (!modifiedFiles.includes("TODO.md")) {
      return NextResponse.json({ message: "No TODO.md change detected." }, { status: 200 })
    }
    const repoFullName = payload.repository.full_name as string

    const clients: { id: string; repo_url?: string }[] = []
    const client = clients.find((c) => {
      if (!c.repo_url) return false
      return c.repo_url.endsWith(repoFullName) || c.repo_url === repoFullName
    })
    if (!client) {
      return NextResponse.json(
        { message: "No client record linked to this repo (configure in Firestore)." },
        { status: 200 }
      )
    }
    const todoContent = await fetchTodoMdFromGitHub(repoFullName)
    if (todoContent) {
      await parseAndSyncTodos(client.id, todoContent)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Failed to fetch TODO.md" }, { status: 500 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
