import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const cookies = req.cookies;
  const allCookies = cookies.getAll();
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  return NextResponse.json({
    cookies: allCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value.substring(0, 50) + '...',
    })),
    session: session ? {
      user: session.user?.id,
      email: session.user?.email,
      expires_at: session.expires_at,
    } : null,
    sessionError: sessionError?.message,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
} 