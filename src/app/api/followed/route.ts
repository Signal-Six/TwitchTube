import { NextResponse } from 'next/server';
import { getAccessToken, getAuthState } from '@/lib/auth';
import { getFollowedChannels, getUsers } from '@/lib/twitch';
import { CACHE_TTL, getCached } from '@/lib/redis';

export async function GET() {
  const authState = await getAuthState();
  
  if (!authState.isAuthenticated || !authState.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authState.user.id;
  const cacheKey = `followed:${userId}`;

  const result = await getCached(
    cacheKey,
    async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('No access token');
      }

      const { data: channels } = await getFollowedChannels(
        userId,
        {
          accessToken,
          clientId: process.env.TWITCH_CLIENT_ID || '',
        }
      );

      const userIds = channels.map(c => c.broadcaster_id);
      const users = await getUsers(userIds, {
        accessToken,
        clientId: process.env.TWITCH_CLIENT_ID || '',
      });

      return channels.map(channel => {
        const user = users.find(u => u.id === channel.broadcaster_id);
        return {
          ...channel,
          profile_image_url: user?.profile_image_url || '',
        };
      });
    },
    CACHE_TTL.FOLLOWED_LIST
  );

  return NextResponse.json(result);
}
