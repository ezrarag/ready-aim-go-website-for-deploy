import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow API routes and static files
  if (pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow public routes
  if (pathname === '/' || pathname.startsWith('/platform') || pathname === '/login' || pathname === '/signup' || pathname === '/onboarding') {
    return NextResponse.next();
  }

  // For dashboard routes, let the client-side handle authentication
  // This prevents infinite recursion issues
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 