import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

interface AutomationRule {
  trigger: 'pulse_priority' | 'pulse_risk' | 'stripe_payment' | 'deployment_failed' | 'email_received';
  condition?: {
    priority?: 'high' | 'medium' | 'low';
    amount?: number;
    client?: string;
  };
  action: {
    channel: string;
    message: string;
    includeDetails?: boolean;
  };
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

    const body: AutomationRule = await req.json();
    const { trigger, condition, action } = body;

    const client = new WebClient(slackToken);

    // Build message based on trigger
    let message = action.message;
    let attachments: any[] = [];

    switch (trigger) {
      case 'pulse_priority':
        if (condition?.priority === 'high') {
          message = `🚨 ${message}`;
          attachments.push({
            color: 'danger',
            title: 'High Priority Alert',
            text: 'This requires immediate attention'
          });
        }
        break;
      
      case 'pulse_risk':
        message = `⚠️ ${message}`;
        attachments.push({
          color: 'warning',
          title: 'Risk Identified',
          text: 'Review this risk in the dashboard'
        });
        break;
      
      case 'stripe_payment':
        if (condition?.amount && condition.amount > 1000) {
          message = `💰 ${message}`;
          attachments.push({
            color: 'good',
            title: 'Payment Received',
            fields: [
              {
                title: 'Amount',
                value: `$${(condition.amount / 100).toFixed(2)}`,
                short: true
              }
            ]
          });
        }
        break;
      
      case 'deployment_failed':
        message = `❌ ${message}`;
        attachments.push({
          color: 'danger',
          title: 'Deployment Failed',
          text: 'Check the deployment logs for details'
        });
        break;
      
      case 'email_received':
        if (condition?.client) {
          message = `📧 ${message}`;
          attachments.push({
            color: 'good',
            title: 'New Email',
            fields: [
              {
                title: 'From',
                value: condition.client,
                short: true
              }
            ]
          });
        }
        break;
    }

    // Send notification to Slack
    const result = await client.chat.postMessage({
      channel: action.channel,
      text: message,
      attachments: action.includeDetails ? attachments : undefined,
      unfurl_links: true
    });

    if (!result.ok) {
      throw new Error(result.error || 'Failed to send automation notification');
    }

    return NextResponse.json({
      success: true,
      channel: result.channel,
      ts: result.ts,
      message: 'Automation triggered successfully'
    });

  } catch (error) {
    console.error('Slack automation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

