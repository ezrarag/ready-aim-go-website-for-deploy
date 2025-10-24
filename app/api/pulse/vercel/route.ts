import { NextRequest, NextResponse } from 'next/server';

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: 'READY' | 'BUILDING' | 'ERROR' | 'CANCELED';
  created: number;
  buildingAt?: number;
  readyAt?: number;
  meta: {
    githubCommitRef?: string;
    githubCommitSha?: string;
    githubCommitMessage?: string;
  };
  target?: 'production' | 'preview';
}

interface PulseEvent {
  source: 'vercel';
  timestamp: string;
  data: any;
  project?: string;
}

export async function GET(req: NextRequest) {
  try {
    const vercelToken = process.env.VERCEL_TOKEN;
    
    if (!vercelToken) {
      return NextResponse.json({
        events: [],
        error: 'Vercel token not configured'
      });
    }

    const events: PulseEvent[] = [];

    // Fetch recent deployments
    try {
      const deploymentsResponse = await fetch(
        'https://api.vercel.com/v6/deployments?limit=20',
        {
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (deploymentsResponse.ok) {
        const data = await deploymentsResponse.json();
        const deployments: VercelDeployment[] = data.deployments || [];
        
        deployments.forEach(deployment => {
          const projectName = extractProjectFromDeployment(deployment);
          
          events.push({
            source: 'vercel',
            timestamp: new Date(deployment.created).toISOString(),
            project: projectName || 'unknown',
            data: {
              type: 'deployment',
              name: deployment.name,
              url: deployment.url,
              state: deployment.state,
              target: deployment.target || 'preview',
              commitRef: deployment.meta.githubCommitRef,
              commitSha: deployment.meta.githubCommitSha,
              commitMessage: deployment.meta.githubCommitMessage,
              created: deployment.created,
              readyAt: deployment.readyAt,
              buildingAt: deployment.buildingAt
            }
          });
        });
      }
    } catch (error) {
      console.error('Error fetching Vercel deployments:', error);
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: events.slice(0, 15), // Return top 15 events
      source: 'vercel',
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Vercel Pulse API error:', error);
    return NextResponse.json({
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to extract project name from deployment
function extractProjectFromDeployment(deployment: VercelDeployment): string | null {
  // Try to extract from deployment name
  const name = deployment.name.toLowerCase();
  
  // Common project patterns
  const patterns = [
    /readyaimgo/i,
    /femi/i,
    /baya/i,
    /jennalyn/i,
    /beam/i,
    /dashboard/i,
    /api/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(name)) {
      return pattern.source.replace(/[^a-zA-Z0-9-_]/g, '');
    }
  }

  // Try to extract from commit message
  if (deployment.meta.githubCommitMessage) {
    const commitMessage = deployment.meta.githubCommitMessage.toLowerCase();
    const keywords = ['femi', 'baya', 'jennalyn', 'beam', 'stripe', 'dashboard'];
    
    for (const keyword of keywords) {
      if (commitMessage.includes(keyword)) {
        return keyword;
      }
    }
  }

  return null;
}
