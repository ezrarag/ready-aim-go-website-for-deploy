import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

interface SlackNotificationRequest {
  channel?: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  attachments?: Array<{
    title?: string;
    text?: string;
    color?: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const slackToken = process.env.SLACK_BOT_TOKEN;
    
    if (!slackToken) {
      return NextResponse.json({
        success: false,
        error: 'Slack bot token not configured'
      }, { status: 400 });
    }

    const body: SlackNotificationRequest = await req.json();
    const { channel, message, priority = 'medium', attachments } = body;

    const client = new WebClient(slackToken);

    // Determine channel or use default
    const targetChannel = channel || process.env.SLACK_DEFAULT_CHANNEL || '#general';

    // Build message with priority indicator
    const priorityEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🔴'
    };

    const formattedMessage = `${priorityEmoji[priority]} ${message}`;

    // Send message to Slack
    const result = await client.chat.postMessage({
      channel: targetChannel,
      text: formattedMessage,
      attachments: attachments?.map(att => ({
        title: att.title,
        text: att.text,
        color: att.color || (priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'good'),
        fields: att.fields
      })),
      unfurl_links: true,
      unfurl_media: true
    });

    if (!result.ok) {
      throw new Error(result.error || 'Failed to send Slack message');
    }

    return NextResponse.json({
      success: true,
      channel: result.channel,
      ts: result.ts,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('Slack notification error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to test Slack connection
export async function GET(req: NextRequest) {
  try {
    const slackToken = process.env.SLACK_BOT_TOKEN;
    
    if (!slackToken) {
      return NextResponse.json({
        connected: false,
        error: 'Slack bot token not configured'
      });
    }

    const client = new WebClient(slackToken);
    
    // Test connection by getting team info
    const result = await client.auth.test();
    
    if (!result.ok) {
      throw new Error(result.error || 'Failed to test Slack connection');
    }

    return NextResponse.json({
      connected: true,
      team: result.team,
      user: result.user,
      url: result.url
    });

  } catch (error) {
    console.error('Slack connection test error:', error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

