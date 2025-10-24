import { NextRequest, NextResponse } from 'next/server';

interface SlackMessage {
  type: string;
  text: string;
  user: string;
  ts: string;
  channel: string;
  thread_ts?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
}

interface PulseEvent {
  source: 'slack';
  timestamp: string;
  data: any;
  project?: string;
}

export async function GET(req: NextRequest) {
  try {
    const slackToken = process.env.SLACK_BOT_TOKEN;
    
    if (!slackToken) {
      return NextResponse.json({
        events: [],
        error: 'Slack bot token not configured'
      });
    }

    const events: PulseEvent[] = [];

    // Fetch recent messages from specific channels
    try {
      // Get list of channels
      const channelsResponse = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=20',
        {
          headers: {
            'Authorization': `Bearer ${slackToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        const channels: SlackChannel[] = channelsData.channels || [];

        // Focus on relevant channels
        const relevantChannels = channels.filter(channel => 
          channel.is_member && (
            channel.name.includes('general') ||
            channel.name.includes('dev') ||
            channel.name.includes('support') ||
            channel.name.includes('client') ||
            channel.name.includes('readyaimgo') ||
            channel.name.includes('beam')
          )
        );

        // Fetch recent messages from each relevant channel
        for (const channel of relevantChannels.slice(0, 5)) {
          try {
            const messagesResponse = await fetch(
              `https://slack.com/api/conversations.history?channel=${channel.id}&limit=10`,
              {
                headers: {
                  'Authorization': `Bearer ${slackToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (messagesResponse.ok) {
              const messagesData = await messagesResponse.json();
              const messages: SlackMessage[] = messagesData.messages || [];

              messages.forEach(message => {
                if (message.type === 'message' && message.text) {
                  const project = extractProjectFromSlackMessage(message.text, channel.name);
                  
                  events.push({
                    source: 'slack',
                    timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
                    project: project || channel.name,
                    data: {
                      type: 'slack_message',
                      text: message.text,
                      user: message.user,
                      channel: channel.name,
                      channelId: channel.id,
                      timestamp: message.ts,
                      threadTs: message.thread_ts,
                      isThread: !!message.thread_ts
                    }
                  });
                }
              });
            }
          } catch (error) {
            console.error(`Error fetching messages from channel ${channel.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Slack channels:', error);
    }

    // Sort events by timestamp (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: events.slice(0, 20), // Return top 20 events
      source: 'slack',
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Slack Pulse API error:', error);
    return NextResponse.json({
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to extract project name from Slack message
function extractProjectFromSlackMessage(text: string, channelName: string): string | null {
  const lowerText = text.toLowerCase();
  const lowerChannel = channelName.toLowerCase();
  
  // Check for client names in message content
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
    if (pattern.test(lowerText)) {
      return pattern.source.replace(/[^a-zA-Z0-9-_]/g, '');
    }
  }

  // Check channel name for project indicators
  if (lowerChannel.includes('client')) return 'clients';
  if (lowerChannel.includes('dev')) return 'development';
  if (lowerChannel.includes('support')) return 'support';
  if (lowerChannel.includes('beam')) return 'beam';

  // Check for common business keywords
  const businessKeywords = [
    'bug', 'issue', 'deploy', 'launch', 'meeting', 'deadline', 'urgent',
    'feedback', 'review', 'testing', 'staging', 'production'
  ];

  for (const keyword of businessKeywords) {
    if (lowerText.includes(keyword)) {
      return 'business';
    }
  }

  return null;
}
