import { formatDistanceToNow } from 'date-fns';

export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function formatDuration(duration: string): string {
  const match = duration.match(/(\d+)h(\d+)m(\d+)s/);
  if (match) {
    const [, hours, minutes, seconds] = match;
    if (hours !== '0') {
      return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.padStart(2, '0')}`;
  }
  return duration;
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getThumbnailUrl(url: string, width = 640, height = 360): string {
  let result = url;
  
  // Handle stream thumbnail format: {width}x{height}
  result = result
    .replace('{width}', width.toString())
    .replace('{height}', height.toString());
  
  // Handle VOD thumbnail format: %{width}x%{height} or %640x%360
  result = result
    .replace(`%${width}x%${height}`, `${width}x${height}`)
    .replace(`%${width}x${height}`, `${width}x${height}`)
    .replace(`${width}x%${height}`, `${width}x${height}`);
  
  // Handle format like %640x%360 (without curly braces)
  result = result
    .replace(/-%(\d+)x%(\d+)\.jpg$/, `-${width}x${height}.jpg`)
    .replace(/%(\d+)x(\d+)/, `${width}x${height}`);
  
  return result;
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
