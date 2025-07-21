import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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
    // Look up client_id by slack_user_id
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('slack_user_id', user_id)
      .maybeSingle();
    if (!client) {
      return new Response('You are not linked to a client account.', { status: 403 });
    }
    const client_id = client.id;
    const parts = text.split(' ');
    if (parts[1] === 'add' && parts.length >= 3) {
      const todoTitle = parts.slice(2).join(' ');
      const { error } = await supabase.from('client_todos').insert({
        client_id,
        title: todoTitle,
        status: 'pending',
      });
      if (error) {
        return new Response('Failed to add TODO.', { status: 500 });
      }
      return new Response(`TODO added: ${todoTitle}`, { status: 200 });
    } else if (parts[1] === 'list') {
      // Fetch all open todos for this client
      const { data: todos, error } = await supabase
        .from('client_todos')
        .select('title, status')
        .eq('client_id', client_id)
        .neq('status', 'completed')
        .order('created_at', { ascending: true });
      if (error) {
        return new Response('Failed to fetch TODOs.', { status: 500 });
      }
      if (!todos || todos.length === 0) {
        return new Response('No open TODOs found.', { status: 200 });
      }
      const list = todos.map((t: any, i: number) => `${i + 1}. ${t.title} [${t.status}]`).join('\n');
      return new Response(`Open TODOs:\n${list}`, { status: 200 });
    } else {
      return new Response('Usage:\n/todo add <task>\n/todo list', { status: 200 });
    }
  } catch (error: any) {
    return new Response('Error processing request.', { status: 500 });
  }
} 