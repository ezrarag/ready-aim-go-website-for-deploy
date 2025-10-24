import { NextRequest, NextResponse } from 'next/server';

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
  };
  internalDate: string;
}

interface PulseEvent {
  source: 'gmail';
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

    // Fetch recent emails
    try {
      const messagesResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread OR newer_than:1d',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const messageIds = messagesData.messages || [];

        // Fetch details for each message
        for (const messageRef of messageIds.slice(0, 10)) {
          try {
            const messageResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/json'
                }
              }
            );

            if (messageResponse.ok) {
              const message: GmailMessage = await messageResponse.json();
              
              const headers = message.payload.headers;
              const from = headers.find(h => h.name === 'From')?.value || '';
              const subject = headers.find(h => h.name === 'Subject')?.value || '';
              const to = headers.find(h => h.name === 'To')?.value || '';
              
              const project = extractProjectFromEmail(subject, from, message.snippet);
              
              events.push({
                source: 'gmail',
                timestamp: new Date(parseInt(message.internalDate)).toISOString(),
                project: project || 'general',
                data: {
                  type: 'email',
                  subject: subject,
                  from: from,
                  to: to,
                  snippet: message.snippet,
                  threadId: message.threadId,
                  messageId: message.id,
                  isUnread: true
                }
              });
            }
          } catch (error) {
            console.error('Error fetching individual message:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Gmail messages:', error);
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: events.slice(0, 10), // Return top 10 events
      source: 'gmail',
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Gmail Pulse API error:', error);
    return NextResponse.json({
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to extract project name from email
function extractProjectFromEmail(subject: string, from: string, snippet: string): string | null {
  const text = `${subject} ${from} ${snippet}`.toLowerCase();
  
  // Check for client names in email content
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

  // Check for common business keywords
  const businessKeywords = [
    'meeting', 'contract', 'invoice', 'payment', 'website', 'launch',
    'update', 'feedback', 'review', 'proposal', 'quote'
  ];

  for (const keyword of businessKeywords) {
    if (text.includes(keyword)) {
      return 'business';
    }
  }

  return null;
}
