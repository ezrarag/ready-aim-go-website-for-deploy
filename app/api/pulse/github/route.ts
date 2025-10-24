import { NextRequest, NextResponse } from 'next/server';

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  homepage: string;
  language: string;
  updated_at: string;
  pushed_at: string;
}

interface PulseEvent {
  source: 'github';
  timestamp: string;
  data: any;
  project?: string;
}

export async function GET(req: NextRequest) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json({
        events: [],
        error: 'GitHub token not configured'
      });
    }

    const events: PulseEvent[] = [];

    // Fetch recent commits from the main repository
    try {
      const commitsResponse = await fetch(
        'https://api.github.com/repos/readyaimgo/readyaimgo/commits?per_page=10',
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ReadyAimGo-Pulse'
          }
        }
      );

      if (commitsResponse.ok) {
        const commits: GitHubCommit[] = await commitsResponse.json();
        
        commits.forEach(commit => {
          // Extract project name from commit message or repo
          const project = extractProjectFromCommit(commit.commit.message);
          
          events.push({
            source: 'github',
            timestamp: commit.commit.author.date,
            project: project || 'readyaimgo',
            data: {
              type: 'commit',
              message: commit.commit.message,
              author: commit.author.login,
              authorName: commit.commit.author.name,
              avatar: commit.author.avatar_url,
              url: commit.html_url,
              sha: commit.sha.substring(0, 7)
            }
          });
        });
      }
    } catch (error) {
      console.error('Error fetching GitHub commits:', error);
    }

    // Fetch recent repository updates
    try {
      const reposResponse = await fetch(
        'https://api.github.com/users/readyaimgo/repos?sort=updated&per_page=10',
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ReadyAimGo-Pulse'
          }
        }
      );

      if (reposResponse.ok) {
        const repos: GitHubRepo[] = await reposResponse.json();
        
        repos.forEach(repo => {
          events.push({
            source: 'github',
            timestamp: repo.pushed_at,
            project: repo.name,
            data: {
              type: 'repo_update',
              name: repo.name,
              description: repo.description,
              language: repo.language,
              homepage: repo.homepage,
              url: repo.html_url,
              lastPush: repo.pushed_at
            }
          });
        });
      }
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: events.slice(0, 20), // Return top 20 events
      source: 'github',
      totalEvents: events.length
    });

  } catch (error) {
    console.error('GitHub Pulse API error:', error);
    return NextResponse.json({
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to extract project name from commit message
function extractProjectFromCommit(message: string): string | null {
  const projectPatterns = [
    /\[([^\]]+)\]/g, // [project-name]
    /^([a-zA-Z0-9-_]+):/g, // project-name: commit message
    /feat\(([^)]+)\)/g, // feat(project-name)
    /fix\(([^)]+)\)/g, // fix(project-name)
  ];

  for (const pattern of projectPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '');
    }
  }

  // Check for common project keywords
  const keywords = ['femi', 'baya', 'jennalyn', 'beam', 'stripe', 'dashboard', 'api'];
  const lowerMessage = message.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerMessage.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}
