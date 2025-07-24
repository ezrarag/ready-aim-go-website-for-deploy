import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

const slackToken = process.env.SLACK_BOT_TOKEN;
const channel = '#test-channel';

export async function POST(req: NextRequest) {
  if (!slackToken) {
    return NextResponse.json({ success: false, error: 'Slack bot token not configured.' }, { status: 500 });
  }

  let message: string;
  try {
    const body = await req.json();
    message = body.message;
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const slack = new WebClient(slackToken);
  try {
    await slack.chat.postMessage({ channel, text: message });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to send message to Slack.' }, { status: 500 });
  }
} 