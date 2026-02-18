import { NextResponse } from 'next/server';
import { getAccessToken, getAuthState } from '@/lib/auth';
import { searchChannels, searchCategories } from '@/lib/twitch';

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
  const query = searchParams.get('query');
  const type = searchParams.get('type') || 'channels';
  const cursor = searchParams.get('cursor') || '';
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const options = {
    accessToken,
    clientId: process.env.TWITCH_CLIENT_ID || '',
  };

  if (type === 'categories') {
    const result = await searchCategories(query, options, limit);
    return NextResponse.json(result);
  } else {
    const result = await searchChannels(query, options, limit, false);
    return NextResponse.json(result);
  }
}
