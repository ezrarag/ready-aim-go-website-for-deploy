import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const error = req.nextUrl.searchParams.get('error');
    
    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=zoho_oauth_${error}`, req.url)
      );
    }
    
    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=zoho_no_code', req.url)
      );
    }

    const zohoClientId = process.env.ZOHO_CLIENT_ID;
    const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectUri = `${req.nextUrl.origin}/api/pulse/zoho-callback`;
    
    if (!zohoClientId || !zohoClientSecret) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=zoho_not_configured', req.url)
      );
    }

    // Determine Zoho data center from client ID or use default
    // You may need to adjust this based on your Zoho account
    const zohoDomain = process.env.ZOHO_DOMAIN || 'accounts.zoho.com';
    
    // Exchange code for tokens
    const tokenResponse = await fetch(`https://${zohoDomain}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: zohoClientId,
        client_secret: zohoClientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Zoho token exchange error:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=zoho_token_exchange_failed', req.url)
      );
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.refresh_token) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=zoho_no_refresh_token', req.url)
      );
    }

    // Redirect to settings page with success message
    // In production, you'd want to securely store the refresh token
    // For now, we'll redirect with instructions
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?zoho_refresh_token=${encodeURIComponent(tokenData.refresh_token)}&success=zoho_connected`,
        req.url
      )
    );

  } catch (error) {
    console.error('Zoho OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=zoho_callback_error', req.url)
    );
  }
}

