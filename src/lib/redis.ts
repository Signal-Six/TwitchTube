import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export const CACHE_TTL = {
  FOLLOWED_LIST: 300,
  LIVE_STREAMS: 30,
  VODS: 120,
};

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached) {
    return cached;
  }
  const data = await fetcher();
  await redis.setex(key, ttl, data);
  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
