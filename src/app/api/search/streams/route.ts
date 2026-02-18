import { NextResponse } from 'next/server';
import { getAccessToken, getAuthState } from '@/lib/auth';
import { getStreams } from '@/lib/twitch';

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
  const userIds = searchParams.get('userIds');
  
  if (!userIds) {
    return NextResponse.json({ error: 'userIds is required' }, { status: 400 });
  }

  const userIdList = userIds.split(',');
  
  const streams = await getStreams(userIdList, {
    accessToken,
    clientId: process.env.TWITCH_CLIENT_ID || '',
  });

  return NextResponse.json(streams);
}
