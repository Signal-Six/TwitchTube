import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getTwitchUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=' + error, request.url));
  }

  if (!code || !state) {
    console.error('Missing code or state');
    return NextResponse.redirect(new URL('/?error=missing_params', request.url));
  }

  const tokens = await exchangeCodeForTokens(code, state);

  if (!tokens) {
    console.error('Failed to exchange code for tokens');
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
  }

  const user = await getTwitchUser(tokens.access_token);

  if (!user) {
    console.error('Failed to get user info');
    return NextResponse.redirect(new URL('/?error=user_fetch_failed', request.url));
  }

  const cookieStore = cookies();
  
  cookieStore.set('twitch_access_token', tokens.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.expires_in,
  });

  cookieStore.set('twitch_refresh_token', tokens.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  cookieStore.set('twitch_user', JSON.stringify(user), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.redirect(new URL('/', request.url));
}
