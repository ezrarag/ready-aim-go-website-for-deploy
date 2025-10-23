import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow API routes and static files
  if (pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow public routes
  if (pathname === '/' || pathname.startsWith('/platform') || pathname === '/login' || pathname === '/signup' || pathname === '/onboarding' || pathname === '/auth/callback') {
    return NextResponse.next();
  }

  // TODO: Implement Firebase authentication middleware
  // For now, allow all dashboard access
  console.log('🔍 Middleware: Allowing all dashboard access - Firebase auth to be implemented');
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 