import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(req: NextRequest) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
        summary: 'AI Pulse not available - configure OPENAI_API_KEY',
        priorities: [],
        risks: [],
        finance: [],
        meetings: [],
        actions: [],
        byProject: [],
        totalEvents: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Collect events from all data sources
    const events: PulseEvent[] = [];
    
    // Fetch from GitHub
    try {
      const githubResponse = await fetch(`${req.nextUrl.origin}/api/pulse/github`);
      if (githubResponse.ok) {
        const githubData = await githubResponse.json();
        events.push(...githubData.events || []);
      }
    } catch (error) {
      console.error('GitHub pulse error:', error);
    }

    // Fetch from Vercel
    try {
      const vercelResponse = await fetch(`${req.nextUrl.origin}/api/pulse/vercel`);
      if (vercelResponse.ok) {
        const vercelData = await vercelResponse.json();
        events.push(...vercelData.events || []);
      }
    } catch (error) {
      console.error('Vercel pulse error:', error);
    }

    // Fetch from Gmail
    try {
      const gmailResponse = await fetch(`${req.nextUrl.origin}/api/pulse/gmail`);
      if (gmailResponse.ok) {
        const gmailData = await gmailResponse.json();
        events.push(...gmailData.events || []);
      }
    } catch (error) {
      console.error('Gmail pulse error:', error);
    }

    // Fetch from Calendar
    try {
      const calendarResponse = await fetch(`${req.nextUrl.origin}/api/pulse/calendar`);
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        events.push(...calendarData.events || []);
      }
    } catch (error) {
      console.error('Calendar pulse error:', error);
    }

    // Fetch from Slack
    try {
      const slackResponse = await fetch(`${req.nextUrl.origin}/api/pulse/slack`);
      if (slackResponse.ok) {
        const slackData = await slackResponse.json();
        events.push(...slackData.events || []);
      }
    } catch (error) {
      console.error('Slack pulse error:', error);
    }

    // Fetch from Stripe
    try {
      const stripeResponse = await fetch(`${req.nextUrl.origin}/api/pulse/stripe`);
      if (stripeResponse.ok) {
        const stripeData = await stripeResponse.json();
        if (!stripeData.disabled) {
          events.push(...stripeData.events || []);
        }
      }
    } catch (error) {
      console.error('Stripe pulse error:', error);
    }

    // If no events, return empty summary
    if (events.length === 0) {
      return NextResponse.json({
        summary: 'No recent activity detected',
        priorities: [],
        risks: [],
        finance: [],
        meetings: [],
        actions: [],
        byProject: [],
        totalEvents: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Create structured prompt for OpenAI
    const eventsText = events.map(event => {
      const time = new Date(event.timestamp).toLocaleString();
      return `[${event.source.toUpperCase()}] ${time}: ${JSON.stringify(event.data)}`;
    }).join('\n');

    const summaryPrompt = `
You are ReadyAimGo's operations chief synthesizing multi-source telemetry for C-Suite decision making. Analyze these recent events and provide executive-level insights.

Events:
${eventsText}

Please provide a structured executive summary with:

1. **Top 5 Priorities** - Immediate action items requiring attention
2. **Risks & Blockers** - Issues that could impact revenue, timelines, or compliance
3. **Finance Highlights** - Payment activity, anomalies, fee optimization opportunities
4. **Meetings to Prep** - Upcoming meetings requiring preparation or follow-up
5. **Suggested Actions** - Specific next steps with recommended owners

Format your response as JSON:
{
  "summary": "Executive summary (2-3 sentences)",
  "priorities": ["Priority 1", "Priority 2", "Priority 3", "Priority 4", "Priority 5"],
  "risks": ["Risk 1", "Risk 2"],
  "finance": ["Finance highlight 1", "Finance highlight 2"],
  "meetings": ["Meeting prep 1", "Meeting prep 2"],
  "actions": [
    {
      "action": "Specific action",
      "owner": "Recommended owner",
      "priority": "high|medium|low",
      "timeline": "Suggested timeline"
    }
  ],
  "byProject": [
    {
      "name": "Project Name",
      "highlights": ["Key highlight 1", "Key highlight 2"],
      "nextAction": "Suggested next action",
      "priority": "high|medium|low"
    }
  ]
}
`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are ReadyAimGo's AI Pulse system. Always respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: summaryPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse AI response
    let pulseData: PulseSummary;
    try {
      pulseData = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      pulseData = {
        summary: aiResponse,
        priorities: [],
        risks: [],
        finance: [],
        meetings: [],
        actions: [],
        byProject: [],
        totalEvents: events.length,
        lastUpdated: new Date().toISOString()
      };
    }

    // Add metadata
    pulseData.totalEvents = events.length;
    pulseData.lastUpdated = new Date().toISOString();

    return NextResponse.json(pulseData);

  } catch (error) {
    console.error('Pulse API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      summary: 'Error generating AI Pulse summary',
      priorities: [],
      risks: [],
      finance: [],
      meetings: [],
      actions: [],
      byProject: [],
      totalEvents: 0,
      lastUpdated: new Date().toISOString()
    }, { status: 500 });
  }
}

interface PulseEvent {
  source: 'github' | 'gmail' | 'calendar' | 'slack' | 'vercel';
  timestamp: string;
  data: any;
  project?: string;
}

interface PulseSummary {
  summary: string;
  priorities: string[];
  risks: string[];
  finance: string[];
  meetings: string[];
  actions: Array<{
    action: string;
    owner: string;
    priority: 'high' | 'medium' | 'low';
    timeline: string;
  }>;
  byProject: Array<{
    name: string;
    highlights: string[];
    nextAction?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  totalEvents: number;
  lastUpdated: string;
}
