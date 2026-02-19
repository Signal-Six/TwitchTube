import { TwitchStream, TwitchVideo, FollowedChannel } from '@/types';

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

interface TwitchApiOptions {
  accessToken: string;
  clientId: string;
}

async function twitchFetch<T>(endpoint: string, options: TwitchApiOptions, params?: Record<string, string | string[]>): Promise<T> {
  const url = new URL(`${TWITCH_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else if (value) {
        url.searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Client-Id': options.clientId,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Twitch API error ${response.status}: ${errorText}`);
    if (response.status === 401) {
      throw new Error('Unauthorized: Token may be expired');
    }
    if (response.status === 429) {
      throw new Error('Rate limited: Too many requests');
    }
    throw new Error(`Twitch API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data as T;
}

export async function getFollowedChannels(
  userId: string,
  options: TwitchApiOptions,
  cursor?: string
): Promise<{ data: FollowedChannel[]; pagination: string }> {
  const params: Record<string, string> = {
    user_id: userId,
    first: '100',
  };
  if (cursor) params.after = cursor;

  const data = await twitchFetch<FollowedChannel[]>('/channels/followed', options, params);
  return { data, pagination: '' };
}

export async function getFollowedStreams(
  userId: string,
  options: TwitchApiOptions,
  cursor?: string
): Promise<{ data: TwitchStream[]; pagination: string }> {
  const params: Record<string, string | string[]> = { first: '100' };
  params.user_id = [userId];
  if (cursor) params.after = cursor;

  const data = await twitchFetch<TwitchStream[]>('/streams/followed', options, params);
  return { data, pagination: '' };
}

export async function getStreams(
  userIds: string[],
  options: TwitchApiOptions
): Promise<TwitchStream[]> {
  if (userIds.length === 0) return [];
  
  const params: Record<string, string | string[]> = { first: '100' };
  params.user_id = userIds;

  const data = await twitchFetch<TwitchStream[]>('/streams', options, params);
  return data;
}

export interface VideosResponse {
  videos: TwitchVideo[];
  pagination: Record<string, string>;
}

async function fetchVideoBatch(
  userIds: string[],
  options: TwitchApiOptions,
  cursor?: string,
  limit: number = 25
): Promise<{ videos: TwitchVideo[]; cursor: string }> {
  if (userIds.length === 0) {
    return { videos: [], cursor: '' };
  }

  const params: Record<string, string | string[]> = {
    first: limit.toString(),
    sort: 'time',
  };
  params.user_id = userIds;
  if (cursor) params.after = cursor;

  const url = new URL(`${TWITCH_API_BASE}/videos`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => url.searchParams.append(key, v));
    } else if (value) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Client-Id': options.clientId,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Twitch API error ${response.status}: ${errorText}`);
    throw new Error(`Twitch API error: ${response.status}`);
  }

  const json = await response.json();
  
  return {
    videos: json.data as TwitchVideo[],
    cursor: json.pagination?.cursor || '',
  };
}

export async function getVideos(
  userIds: string[],
  options: TwitchApiOptions,
  paginationCursors?: Record<string, string>,
  limit: number = 25
): Promise<VideosResponse> {
  if (userIds.length === 0) {
    return { videos: [], pagination: {} };
  }

  const batchSize = 10;
  const batches: string[][] = [];
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    batches.push(userIds.slice(i, i + batchSize));
  }

  const batchKeys = batches.map((_, idx) => `batch_${idx}`);
  
  const results = await Promise.all(
    batches.map((batch, idx) => {
      const cursor = paginationCursors?.[batchKeys[idx]];
      return fetchVideoBatch(batch, options, cursor, limit);
    })
  );

  const allVideos: TwitchVideo[] = [];
  const newPagination: Record<string, string> = {};

  results.forEach((result, idx) => {
    allVideos.push(...result.videos);
    if (result.cursor) {
      newPagination[batchKeys[idx]] = result.cursor;
    }
  });

  allVideos.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    videos: allVideos.slice(0, limit),
    pagination: newPagination,
  };
}

export async function getUsers(
  identifiers: string[],
  options: TwitchApiOptions,
  type: 'id' | 'login' = 'id'
): Promise<{ id: string; login: string; display_name: string; profile_image_url: string }[]> {
  if (identifiers.length === 0) return [];
  
  const params: Record<string, string> = {};
  if (type === 'id') {
    identifiers.forEach(id => params.user_id = id);
  } else {
    identifiers.forEach(login => params.login = login);
  }
  
  const data = await twitchFetch<{ id: string; login: string; display_name: string; profile_image_url: string }[]>('/users', options, params);
  return data;
}

export async function getGames(
  gameIds: string[],
  options: TwitchApiOptions
): Promise<{ id: string; name: string; box_art_url: string }[]> {
  if (gameIds.length === 0) return [];
  
  const params: Record<string, string> = {};
  gameIds.forEach(id => params.id = id);

  const data = await twitchFetch<{ id: string; name: string; box_art_url: string }[]>('/games', options, params);
  return data;
}

export interface SearchChannelResult {
  broadcaster_login: string;
  display_name: string;
  game_id: string;
  game_name: string;
  is_live: boolean;
  tags_id: string[];
  thumbnail_url: string;
  title: string;
}

export interface SearchCategoryResult {
  box_art_url: string;
  id: string;
  name: string;
}

export async function searchChannels(
  query: string,
  options: TwitchApiOptions,
  limit: number = 25,
  liveOnly: boolean = false
): Promise<{ data: SearchChannelResult[]; pagination: string }> {
  const params: Record<string, string | string[]> = {
    query,
    first: limit.toString(),
  };
  if (liveOnly) {
    params.live_only = 'true';
  }

  const data = await twitchFetch<SearchChannelResult[]>('/search/channels', options, params);
  const response = await fetch(`${TWITCH_API_BASE}/search/channels?${new URLSearchParams(params as Record<string, string>).toString()}`, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Client-Id': options.clientId,
    },
  });
  const json = await response.json();
  return {
    data: json.data || [],
    pagination: json.pagination?.cursor || '',
  };
}

export async function searchCategories(
  query: string,
  options: TwitchApiOptions,
  limit: number = 25
): Promise<{ data: SearchCategoryResult[]; pagination: string }> {
  const params: Record<string, string> = {
    query,
    first: limit.toString(),
  };

  const response = await fetch(`${TWITCH_API_BASE}/search/categories?${new URLSearchParams(params).toString()}`, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Client-Id': options.clientId,
    },
  });
  const json = await response.json();
  return {
    data: json.data || [],
    pagination: json.pagination?.cursor || '',
  };
}
