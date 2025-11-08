import { NextRequest, NextResponse } from 'next/server';

interface ZohoCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  location?: string;
  organizer: {
    email: string;
    displayName?: string;
  };
  isAllDay?: boolean;
  recurrence?: any;
}

interface ZohoCalendarResponse {
  data: ZohoCalendarEvent[];
  nextPageToken?: string;
}

interface PulseEvent {
  source: 'zoho-calendar';
  timestamp: string;
  data: any;
  project?: string;
}

export async function GET(req: NextRequest) {
  try {
    const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const zohoClientId = process.env.ZOHO_CLIENT_ID;
    const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET;
    const zohoCalendarId = process.env.ZOHO_CALENDAR_ID || 'primary'; // Default to primary calendar
    
    if (!zohoRefreshToken || !zohoClientId || !zohoClientSecret) {
      return NextResponse.json({
        events: [],
        error: 'Zoho OAuth not configured'
      });
    }

    // Get access token using refresh token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: zohoClientId,
        client_secret: zohoClientSecret,
        refresh_token: zohoRefreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Zoho token refresh error:', errorText);
      throw new Error('Failed to refresh Zoho token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const events: PulseEvent[] = [];

    // Fetch upcoming events from Zoho Calendar API
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Zoho Calendar API endpoint
      // Format: https://calendar.zoho.com/api/v1/calendars/{calendarId}/events
      const calendarResponse = await fetch(
        `https://calendar.zoho.com/api/v1/calendars/${zohoCalendarId}/events?` +
        `startTime=${now.toISOString()}&endTime=${nextWeek.toISOString()}&` +
        `sortBy=startTime&sortOrder=asc&limit=20`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (calendarResponse.ok) {
        const calendarData: ZohoCalendarResponse = await calendarResponse.json();
        const calendarEvents: ZohoCalendarEvent[] = calendarData.data || [];
        
        calendarEvents.forEach(event => {
          const project = extractProjectFromEvent(event);
          const startTime = event.start.dateTime;
          
          events.push({
            source: 'zoho-calendar',
            timestamp: startTime || new Date().toISOString(),
            project: project || 'general',
            data: {
              type: 'calendar_event',
              summary: event.title,
              description: event.description,
              start: event.start,
              end: event.end,
              location: event.location,
              attendees: event.attendees || [],
              organizer: event.organizer,
              eventId: event.id,
              isAllDay: event.isAllDay,
              isUpcoming: true
            }
          });
        });
      } else {
        const errorText = await calendarResponse.text();
        console.error('Zoho Calendar API error:', errorText);
        
        // Fallback: Try alternative endpoint format
        try {
          const altResponse = await fetch(
            `https://calendar.zoho.com/api/v1/events?` +
            `startTime=${now.toISOString()}&endTime=${nextWeek.toISOString()}&limit=20`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
              }
            }
          );
          
          if (altResponse.ok) {
            const altData: ZohoCalendarResponse = await altResponse.json();
            const altEvents: ZohoCalendarEvent[] = altData.data || [];
            
            altEvents.forEach(event => {
              const project = extractProjectFromEvent(event);
              const startTime = event.start.dateTime;
              
              events.push({
                source: 'zoho-calendar',
                timestamp: startTime || new Date().toISOString(),
                project: project || 'general',
                data: {
                  type: 'calendar_event',
                  summary: event.title,
                  description: event.description,
                  start: event.start,
                  end: event.end,
                  location: event.location,
                  attendees: event.attendees || [],
                  organizer: event.organizer,
                  eventId: event.id,
                  isAllDay: event.isAllDay,
                  isUpcoming: true
                }
              });
            });
          }
        } catch (altError) {
          console.error('Zoho Calendar API fallback error:', altError);
        }
      }
    } catch (error) {
      console.error('Error fetching Zoho Calendar events:', error);
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: events.slice(0, 15), // Return top 15 events
      source: 'zoho-calendar',
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Zoho Calendar Pulse API error:', error);
    return NextResponse.json({
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to extract project name from calendar event
function extractProjectFromEvent(event: ZohoCalendarEvent): string | null {
  const text = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase();
  
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


