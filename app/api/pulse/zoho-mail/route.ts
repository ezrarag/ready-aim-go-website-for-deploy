import { NextRequest, NextResponse } from 'next/server';

interface ZohoMailMessage {
  id: string;
  conversationId: string;
  subject: string;
  from: {
    emailAddress: string;
    displayName?: string;
  };
  to: Array<{
    emailAddress: string;
    displayName?: string;
  }>;
  snippet?: string;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
}

interface ZohoMailResponse {
  data: ZohoMailMessage[];
  nextPageToken?: string;
}

interface PulseEvent {
  source: 'zoho-mail';
  timestamp: string;
  data: any;
  project?: string;
}

export async function GET(req: NextRequest) {
  try {
    const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const zohoClientId = process.env.ZOHO_CLIENT_ID;
    const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET;
    const zohoAccountId = process.env.ZOHO_ACCOUNT_ID || 'me'; // Default to 'me' for primary account
    
    if (!zohoRefreshToken || !zohoClientId || !zohoClientSecret) {
      return NextResponse.json({
        events: [],
        error: 'Zoho OAuth not configured'
      });
    }

    // Get access token using refresh token
    // Zoho OAuth token endpoint
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

    // Fetch recent emails from Zoho Mail API
    // Zoho Mail API endpoint (using Mail API v2)
    try {
      // Get messages from inbox - last 20 unread or recent messages
      const messagesResponse = await fetch(
        `https://mail.zoho.com/api/accounts/${zohoAccountId}/messages?limit=20&sort=receivedTime&sortOrder=desc`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (messagesResponse.ok) {
        const messagesData: ZohoMailResponse = await messagesResponse.json();
        const messages = messagesData.data || [];

        // Process each message
        for (const message of messages.slice(0, 15)) {
          try {
            const project = extractProjectFromEmail(
              message.subject,
              message.from.emailAddress,
              message.snippet || ''
            );
            
            events.push({
              source: 'zoho-mail',
              timestamp: new Date(message.receivedDateTime).toISOString(),
              project: project || 'general',
              data: {
                type: 'email',
                subject: message.subject,
                from: message.from.emailAddress,
                fromName: message.from.displayName,
                to: message.to.map(t => t.emailAddress),
                snippet: message.snippet,
                conversationId: message.conversationId,
                messageId: message.id,
                isUnread: !message.isRead,
                hasAttachments: message.hasAttachments,
                receivedDateTime: message.receivedDateTime
              }
            });
          } catch (error) {
            console.error('Error processing Zoho message:', error);
          }
        }
      } else {
        const errorText = await messagesResponse.text();
        console.error('Zoho Mail API error:', errorText);
        
        // Fallback: Try alternative Zoho Mail API endpoint format
        // Some Zoho configurations use different API endpoints
        try {
          const altResponse = await fetch(
            `https://mail.zoho.com/api/accounts/${zohoAccountId}/messages?limit=20`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
              }
            }
          );
          
          if (altResponse.ok) {
            const altData: ZohoMailResponse = await altResponse.json();
            const altMessages = altData.data || [];
            
            for (const message of altMessages.slice(0, 15)) {
              const project = extractProjectFromEmail(
                message.subject,
                message.from.emailAddress,
                message.snippet || ''
              );
              
              events.push({
                source: 'zoho-mail',
                timestamp: new Date(message.receivedDateTime).toISOString(),
                project: project || 'general',
                data: {
                  type: 'email',
                  subject: message.subject,
                  from: message.from.emailAddress,
                  fromName: message.from.displayName,
                  to: message.to.map(t => t.emailAddress),
                  snippet: message.snippet,
                  conversationId: message.conversationId,
                  messageId: message.id,
                  isUnread: !message.isRead,
                  hasAttachments: message.hasAttachments,
                  receivedDateTime: message.receivedDateTime
                }
              });
            }
          }
        } catch (altError) {
          console.error('Zoho Mail API fallback error:', altError);
        }
      }
    } catch (error) {
      console.error('Error fetching Zoho Mail messages:', error);
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: events.slice(0, 10), // Return top 10 events
      source: 'zoho-mail',
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Zoho Mail Pulse API error:', error);
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


