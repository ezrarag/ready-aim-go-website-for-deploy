import { NextRequest, NextResponse } from 'next/server';

// Placeholder for sending to Cursor agent
async function sendToCursorAgent(todo: any) {
  // TODO: Implement actual API call to Cursor agent
  // Example: await fetch('https://cursor-agent/api', { method: 'POST', body: JSON.stringify(todo) })
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const todo = await req.json();
    // todo: { id, title, description, status, client_id, due_date }
    await sendToCursorAgent(todo);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
} 