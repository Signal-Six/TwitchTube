import { NextResponse } from 'next/server';
import { getAccessToken, getAuthState } from '@/lib/auth';
import { getUsers } from '@/lib/twitch';
import { CACHE_TTL, getCached } from '@/lib/redis';

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

  const cacheKey = `channel_stream:${login}`;

  const result = await getCached(
    cacheKey,
    async () => {
      const users = await getUsers([login], {
        accessToken,
        clientId: process.env.TWITCH_CLIENT_ID || '',
      }, 'login');
      
      if (users.length === 0) {
        return { stream: null };
      }

      const userId = users[0].id;
      
      const response = await fetch(
        `https://api.twitch.tv/helix/streams?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID || '',
          },
        }
      );

      if (!response.ok) {
        console.error(`Twitch API error: ${response.status}`);
        return { stream: null };
      }

      const json = await response.json();
      const stream = json.data?.[0] || null;
      
      return {
        stream: stream ? {
          ...stream,
          profile_image_url: users[0].profile_image_url,
        } : null,
      };
    },
    CACHE_TTL.LIVE_STREAMS
  );

  return NextResponse.json(result);
}
