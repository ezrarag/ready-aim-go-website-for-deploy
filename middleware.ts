import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  // TEMPORARILY DISABLE AUTH CHECK FOR DEBUGGING
  console.log('🔍 Middleware: Temporarily allowing all dashboard access for debugging');
  return NextResponse.next();

  // COMMENTED OUT FOR DEBUGGING - UNCOMMENT LATER
  /*
  // Handle authentication for protected routes
  if (pathname.startsWith('/dashboard')) {
    // Get the auth token from cookies - check multiple possible cookie names
    const token = req.cookies.get('supabase.auth.token')?.value || 
                  req.cookies.get('sb-access-token')?.value || 
                  req.cookies.get('supabase-auth-token')?.value ||
                  req.cookies.get('sb-fnaasdxpkrhjmotiemog-auth-token')?.value;

    console.log('🔍 Middleware: Checking auth for path:', pathname);
    console.log('🔍 Middleware: Token found:', !!token);
    console.log('🔍 Middleware: Available cookies:', Object.keys(req.cookies.getAll()));

    if (!token) {
      console.log('❌ Middleware: No token found, redirecting to login');
      // No token found, redirect to login
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, check if user is admin
    if (pathname.startsWith('/dashboard/admin')) {
      try {
        console.log('🔍 Middleware: Checking admin access');
        
        // Create Supabase client for server-side auth check
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify the token and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        console.log('🔍 Middleware: Auth check result:', { user: !!user, error: authError });
        
        if (authError || !user) {
          console.log('❌ Middleware: Invalid token, redirecting to login');
          // Invalid token, redirect to login
          const loginUrl = new URL('/login', req.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }

        console.log('✅ Middleware: User authenticated, allowing admin access');
      } catch (error) {
        console.error('❌ Middleware error:', error);
        // Error checking auth, redirect to login
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }
  */

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 