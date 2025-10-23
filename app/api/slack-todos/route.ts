import { NextRequest, NextResponse } from 'next/server';

// Helper to parse x-www-form-urlencoded body
async function parseFormBody(req: NextRequest) {
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseFormBody(req);
    const { user_id, text } = body;
    if (!user_id || !text || !text.startsWith('/todo')) {
      return new Response('Invalid command.', { status: 400 });
    }
    
    // TODO: Implement Firebase database operations
    return new Response('Firebase integration not yet implemented', { status: 501 });
  } catch (error: any) {
    return new Response('Error processing request.', { status: 500 });
  }
} 