import { NextResponse } from 'next/server';
import { getAccessToken, getAuthState } from '@/lib/auth';
import { getFollowedStreams, getUsers } from '@/lib/twitch';
import { CACHE_TTL, getCached } from '@/lib/redis';

export async function GET() {
  const authState = await getAuthState();
  
  if (!authState.isAuthenticated || !authState.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authState.user.id;
  const cacheKey = `streams:${userId}`;

  const result = await getCached(
    cacheKey,
    async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('No access token');
      }

      const { data: streams } = await getFollowedStreams(userId, {
        accessToken,
        clientId: process.env.TWITCH_CLIENT_ID || '',
      });

      const userIds = streams.map(s => s.user_id);
      const users = await getUsers(userIds, {
        accessToken,
        clientId: process.env.TWITCH_CLIENT_ID || '',
      });

      return streams.map(stream => {
        const user = users.find(u => u.id === stream.user_id);
        return {
          ...stream,
          profile_image_url: user?.profile_image_url || '',
        };
      });
    },
    CACHE_TTL.LIVE_STREAMS
  );

  return NextResponse.json(result);
}
