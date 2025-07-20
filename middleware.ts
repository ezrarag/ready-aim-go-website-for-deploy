import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporary mock profile so we can simulate onboarding/role-based redirects
const mockProfile = {
  role: 'client', // change to 'operator' to test operator dashboard
  is_demo_client: false,
  contract_accepted_at: new Date().toISOString(), // or null to test contract step
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow API routes and static files
  if (pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Skip Supabase session/auth checks
  console.log('[Middleware] Skipping login, simulating profile:', mockProfile);

  // Redirect logic based on the simulated profile
  if (!mockProfile) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  if (!mockProfile.contract_accepted_at) {
    return NextResponse.redirect(new URL('/onboarding/contract', req.url));
  }

  if (pathname.startsWith('/dashboard/operator') && mockProfile.role !== 'operator') {
    return NextResponse.redirect(new URL('/dashboard/client', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'], // Protects all dashboard routes
}; 