import { NextResponse } from 'next/server';
import { getAccessToken, getAuthState } from '@/lib/auth';
import { getUsers } from '@/lib/twitch';

export async function GET(request: Request) {
  const authState = await getAuthState();
  
  if (!authState.isAuthenticated || !authState.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const login = searchParams.get('login');
  
  if (!login) {
    return NextResponse.json({ error: 'login is required' }, { status: 400 });
  }

  const users = await getUsers([login], {
    accessToken,
    clientId: process.env.TWITCH_CLIENT_ID || '',
  }, 'login');

  if (users.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = users[0];
  return NextResponse.json({
    id: user.id,
    login: user.login,
    display_name: user.display_name,
    profile_image_url: user.profile_image_url,
  });
}
