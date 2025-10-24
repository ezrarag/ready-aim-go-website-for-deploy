import { NextRequest, NextResponse } from 'next/server';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  location?: string;
  creator: {
    email: string;
    displayName?: string;
  };
}

interface PulseEvent {
  source: 'calendar';
  timestamp: string;
  data: any;
  project?: string;
}

export async function GET(req: NextRequest) {
  try {
    const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!googleRefreshToken || !googleClientId || !googleClientSecret) {
      return NextResponse.json({
        events: [],
        error: 'Google OAuth not configured'
      });
    }

    // Get access token using refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: googleRefreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh Google token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const events: PulseEvent[] = [];

    // Fetch upcoming events (next 7 days)
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${now.toISOString()}&timeMax=${nextWeek.toISOString()}&` +
        `orderBy=startTime&singleEvents=true&maxResults=20`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        const calendarEvents: CalendarEvent[] = calendarData.items || [];
        
        calendarEvents.forEach(event => {
          const project = extractProjectFromEvent(event);
          const startTime = event.start.dateTime || event.start.date;
          
          events.push({
            source: 'calendar',
            timestamp: startTime || new Date().toISOString(),
            project: project || 'general',
            data: {
              type: 'calendar_event',
              summary: event.summary,
              description: event.description,
              start: event.start,
              end: event.end,
              location: event.location,
              attendees: event.attendees || [],
              creator: event.creator,
              eventId: event.id,
              isUpcoming: true
            }
          });
        });
      }
    } catch (error) {
      console.error('Error fetching Calendar events:', error);
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: events.slice(0, 15), // Return top 15 events
      source: 'calendar',
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Calendar Pulse API error:', error);
    return NextResponse.json({
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to extract project name from calendar event
function extractProjectFromEvent(event: CalendarEvent): string | null {
  const text = `${event.summary} ${event.description || ''} ${event.location || ''}`.toLowerCase();
  
  // Check for client names in event content
  const clientPatterns = [
    /femi/i,
    /baya/i,
    /jennalyn/i,
    /beam/i,
    /stripe/i,
    /dashboard/i,
    /api/i,
    /readyaimgo/i
  ];

  for (const pattern of clientPatterns) {
    if (pattern.test(text)) {
      return pattern.source.replace(/[^a-zA-Z0-9-_]/g, '');
    }
  }

  // Check for meeting types
  const meetingTypes = [
    'standup', 'review', 'planning', 'retrospective', 'demo', 'client call',
    'interview', 'presentation', 'workshop', 'training'
  ];

  for (const type of meetingTypes) {
    if (text.includes(type)) {
      return 'meetings';
    }
  }

  // Check for business activities
  const businessActivities = [
    'contract', 'invoice', 'payment', 'launch', 'deployment', 'testing',
    'feedback', 'review', 'proposal', 'quote', 'negotiation'
  ];

  for (const activity of businessActivities) {
    if (text.includes(activity)) {
      return 'business';
    }
  }

  return null;
}
