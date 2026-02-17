import { NextResponse } from 'next/server';
import { getAccessToken, getAuthState } from '@/lib/auth';
import { getVideos } from '@/lib/twitch';
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
  const userIdsParam = searchParams.get('userId');
  const cursorParam = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  
  if (!userIdsParam) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const userIds = userIdsParam.split(',');

  let paginationCursors: Record<string, string> | undefined;
  
  if (cursorParam) {
    try {
      paginationCursors = JSON.parse(cursorParam);
    } catch {
      paginationCursors = undefined;
    }
  }

  if (Object.keys(paginationCursors || {}).length > 0) {
    const { videos, pagination } = await getVideos(userIds, {
      accessToken,
      clientId: process.env.TWITCH_CLIENT_ID || '',
    }, paginationCursors, limit);

    return NextResponse.json({ videos, pagination });
  }

  const cacheKey = `videos:${userIds.sort().join(',')}`;

  const result = await getCached(
    cacheKey,
    async () => {
      const { videos, pagination } = await getVideos(userIds, {
        accessToken,
        clientId: process.env.TWITCH_CLIENT_ID || '',
      }, undefined, limit);
      return { videos, pagination };
    },
    CACHE_TTL.VODS
  );

  return NextResponse.json(result);
}
