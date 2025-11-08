import { NextRequest, NextResponse } from 'next/server';

interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  plan?: string;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ContactFormData = await req.json();
    const { name, email, company, phone, plan, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Option 1: Send to email service (SendGrid, Resend, etc.)
    const emailService = process.env.EMAIL_SERVICE || 'console'; // 'sendgrid', 'resend', 'console'
    const contactEmail = process.env.CONTACT_EMAIL || 'hello@readyaimgo.biz';

    if (emailService === 'console') {
      // Log to console for development
      console.log('=== CONTACT FORM SUBMISSION ===');
      console.log('Name:', name);
      console.log('Email:', email);
      console.log('Company:', company || 'N/A');
      console.log('Phone:', phone || 'N/A');
      console.log('Plan:', plan || 'N/A');
      console.log('Message:', message);
      console.log('Timestamp:', new Date().toISOString());
      console.log('================================');

      // In production, you would:
      // 1. Save to database (Supabase)
      // 2. Send email via SendGrid/Resend
      // 3. Send Slack notification
      // 4. Create CRM entry

      // TODO: Implement actual email sending
      // Example with SendGrid:
      // await sendEmail({
      //   to: contactEmail,
      //   subject: `New Contact Form: ${plan || 'General Inquiry'}`,
      //   html: formatContactEmail(body)
      // });

      return NextResponse.json({
        success: true,
        message: 'Contact form submitted successfully',
      });
    }

    // Option 2: Save to Supabase database
    // Uncomment when Supabase is configured
    /*
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert({
        name,
        email,
        company,
        phone,
        plan,
        message,
        created_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }
    */

    // Option 3: Send Slack notification
    if (process.env.SLACK_BOT_TOKEN) {
      try {
        await fetch(`${req.nextUrl.origin}/api/slack/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: process.env.SLACK_CONTACT_CHANNEL || '#contact',
            message: `New contact form submission from ${name}`,
            priority: 'medium',
            attachments: [
              {
                title: 'Contact Form Submission',
                text: message,
                color: 'good',
                fields: [
                  { title: 'Name', value: name, short: true },
                  { title: 'Email', value: email, short: true },
                  { title: 'Company', value: company || 'N/A', short: true },
                  { title: 'Phone', value: phone || 'N/A', short: true },
                  { title: 'Plan Interest', value: plan || 'General Inquiry', short: true },
                ],
              },
            ],
          }),
        });
      } catch (slackError) {
        console.error('Slack notification error:', slackError);
        // Don't fail the request if Slack fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to submit contact form',
      },
      { status: 500 }
    );
  }
}

