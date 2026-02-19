import { NextResponse } from 'next/server';
import { getAccessToken, getAuthState } from '@/lib/auth';
import { getVideos, getUsers } from '@/lib/twitch';
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
  const loginParam = searchParams.get('login');
  const cursorParam = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  
  let userIds: string[] = [];
  
  if (userIdsParam) {
    userIds = userIdsParam.split(',');
  } else if (loginParam) {
    const users = await getUsers([loginParam], {
      accessToken,
      clientId: process.env.TWITCH_CLIENT_ID || '',
    }, 'login');
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    userIds = [users[0].id];
  } else {
    return NextResponse.json({ error: 'userId or login is required' }, { status: 400 });
  }

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
