// NOTE: You may need to install @octokit/rest: pnpm add @octokit/rest
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from 'octokit';
// TODO: Implement Firebase database operations

// TODO: Implement Firebase database operations
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function fetchTodoMdFromGitHub(repo: string) {
  try {
    const [owner, repoName] = repo.split('/');
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path: 'TODO.md',
    });
    const content = Buffer.from((data as any).content, 'base64').toString('utf-8');
    return content;
  } catch (error) {
    return null;
  }
}

async function parseAndSyncTodos(client_id: string, todoContent: string) {
  const lines = todoContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  for (const line of lines) {
    const { data: existing } = await supabase
      .from('client_todos')
      .select('id')
      .eq('client_id', client_id)
      .eq('title', line)
      .maybeSingle();
    if (existing) continue;
    await supabase.from('client_todos').insert({
      client_id,
      title: line,
      status: 'pending',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get('x-github-event');
    if (event !== 'push') {
      return NextResponse.json({ message: 'Not a push event, ignoring.' }, { status: 200 });
    }
    const payload = await req.json();
    // Find if TODO.md was changed in this push
    const modifiedFiles = [
      ...(payload.head_commit?.added || []),
      ...(payload.head_commit?.modified || []),
      ...(payload.head_commit?.removed || []),
    ];
    if (!modifiedFiles.includes('TODO.md')) {
      return NextResponse.json({ message: 'No TODO.md change detected.' }, { status: 200 });
    }
    const repoFullName = payload.repository.full_name; // e.g. 'org/repo'
    // Fetch clients from DB
    const { data: clients } = await supabase.from('clients').select('id, repo_url');
    const client = (clients || []).find((c: any) => {
      if (!c.repo_url) return false;
      // Accept both https://github.com/org/repo and org/repo
      return c.repo_url.endsWith(repoFullName) || c.repo_url === repoFullName;
    });
    if (!client) {
      return NextResponse.json({ error: 'No client found for this repo.' }, { status: 404 });
    }
    const todoContent = await fetchTodoMdFromGitHub(repoFullName);
    if (todoContent) {
      await parseAndSyncTodos(client.id, todoContent);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to fetch TODO.md' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

// README: GitHub Webhook Setup
// 1. Go to your GitHub repo Settings > Webhooks > Add webhook.
// 2. Set the Payload URL to: https://yourdomain.com/api/github-sync
// 3. Content type: application/json
// 4. Select "Just the push event".
// 5. Save. Now, whenever TODO.md changes, the sync will trigger. 