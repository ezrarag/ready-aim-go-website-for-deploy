import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookies = req.cookies;
  const allCookies = cookies.getAll();
  
  // TODO: Implement Firebase authentication
  return NextResponse.json({
    cookies: allCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value.substring(0, 50) + '...',
    })),
    session: null, // Firebase auth to be implemented
    sessionError: 'Firebase authentication not yet implemented',
    firebaseConfig: 'To be configured',
    hasFirebaseKey: false,
  });
} 