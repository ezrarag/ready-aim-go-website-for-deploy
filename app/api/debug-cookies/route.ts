import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookies = req.cookies;
  const allCookies = cookies.getAll();
  
  console.log('🍪 All cookies:', allCookies);
  
  return NextResponse.json({
    cookies: allCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value.substring(0, 50) + '...', // Truncate for security
    })),
    supabaseCookies: allCookies.filter(cookie => 
      cookie.name.includes('sb-') || 
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth')
    ).map(cookie => cookie.name)
  });
} 