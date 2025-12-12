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
    // Use VERCEL_ACCESS_TOKEN (server-only, never exposed to client)
    const vercelToken = process.env.VERCEL_ACCESS_TOKEN || process.env.VERCEL_TOKEN;
    
    if (!vercelToken) {
      console.log('Vercel token not configured - skipping Vercel deployments');
      return NextResponse.json({
        events: [],
        error: 'Vercel token not configured'
      });
    }

    const events: PulseEvent[] = [];

    // Fetch recent deployments
    try {
      // Try to get team ID from env if available (for team accounts)
      const teamId = process.env.VERCEL_TEAM_ID;
      const deploymentsUrl = teamId 
        ? `https://api.vercel.com/v6/deployments?teamId=${teamId}&limit=20`
        : 'https://api.vercel.com/v6/deployments?limit=20';
      
      console.log(`[Vercel API] Fetching from: ${deploymentsUrl}`);
      
      const deploymentsResponse = await fetch(
        deploymentsUrl,
        {
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (deploymentsResponse.ok) {
        const data = await deploymentsResponse.json();
        const deployments: any[] = data.deployments || [];
        
        console.log(`[Vercel API] Found ${deployments.length} total deployments`);
        console.log(`[Vercel API] Sample deployment structure:`, deployments[0] ? JSON.stringify(deployments[0], null, 2) : 'No deployments');
        
        // Vercel API v6 structure: deployments have 'url' field directly, or might be in 'alias' array
        deployments.forEach((deployment: any) => {
          // Check various possible URL fields
          const deploymentUrl = deployment.url || 
                               deployment.alias?.[0] || 
                               (deployment.alias && Array.isArray(deployment.alias) ? deployment.alias[0] : null) ||
                               `https://${deployment.name}.vercel.app`;
          
          console.log(`[Vercel API] Deployment: ${deployment.name}, state: ${deployment.state}, url: ${deploymentUrl}`);
          
          // Only include READY deployments
          if (deployment.state === 'READY') {
            // Use the deployment URL (could be from url field, alias array, or constructed)
            const finalUrl = deploymentUrl && deploymentUrl.startsWith('http') 
              ? deploymentUrl 
              : `https://${deployment.name}.vercel.app`;
            
            const projectName = extractProjectFromDeployment(deployment);
            
            events.push({
              source: 'vercel',
              timestamp: new Date(deployment.created || Date.now()).toISOString(),
              project: projectName || 'unknown',
              data: {
                type: 'deployment',
                uid: deployment.uid || deployment.id,
                name: deployment.name,
                url: finalUrl,
                state: deployment.state,
                target: deployment.target || deployment.production ? 'production' : 'preview',
                commitRef: deployment.meta?.githubCommitRef || deployment.gitSource?.ref,
                commitSha: deployment.meta?.githubCommitSha,
                commitMessage: deployment.meta?.githubCommitMessage,
                created: deployment.created || Date.now(),
                readyAt: deployment.readyAt,
                buildingAt: deployment.buildingAt
              }
            });
          }
        });
        
        console.log(`[Vercel API] Found ${events.length} READY deployments after processing`);
        console.log(`[Vercel API] Returning ${events.length} events`);
      } else {
        const errorText = await deploymentsResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        console.error(`[Vercel API] Error ${deploymentsResponse.status}: ${deploymentsResponse.statusText}`);
        console.error(`[Vercel API] Error details:`, errorData);
        
        // If token is invalid, provide helpful error message
        if (deploymentsResponse.status === 403 && errorData.error?.invalidToken) {
          console.error(`[Vercel API] Token is invalid or expired. Please generate a new token at: https://vercel.com/account/tokens`);
        }
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
