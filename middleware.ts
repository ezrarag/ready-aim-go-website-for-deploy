import { NextRequest, NextResponse } from 'next/server';

const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/client',
  '/dashboard/operator',
  '/dashboard/admin',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only run on dashboard routes
  if (!DASHBOARD_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get the Supabase session from cookies
  const supabaseToken = req.cookies.get('sb-access-token')?.value;
  if (!supabaseToken) {
    // Not authenticated
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Fetch user profile from Supabase REST API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${req.cookies.get('sb-user-id')?.value}`, {
    headers: {
      apikey: supabaseKey || '',
      Authorization: `Bearer ${supabaseToken}`,
    },
  });
  const profileData = await profileRes.json();
  const role = profileData?.[0]?.role;

  if (!role) {
    // No profile or role found
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Determine correct dashboard path
  const roleToDashboard = {
    client: '/dashboard/client',
    operator: '/dashboard/operator',
    admin: '/dashboard/admin',
  };
  const correctDashboard = roleToDashboard[role as keyof typeof roleToDashboard];

  // If user is on the wrong dashboard, redirect
  if (!pathname.startsWith(correctDashboard)) {
    return NextResponse.redirect(new URL(correctDashboard, req.url));
  }

  // Otherwise, allow
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
}; 