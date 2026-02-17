'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { TwitchStream, TwitchVideo } from '@/types';
import { formatViewCount, formatTimeAgo, getThumbnailUrl } from '@/lib/utils';
import { LiveBadge } from './LiveBadge';

interface VideoCardProps {
  item: TwitchStream | TwitchVideo;
  isLive?: boolean;
  onClick?: () => void;
  onVideoProgress?: (videoId: string, progress: number) => void;
}

export function VideoCard({ item, isLive = false, onClick, onVideoProgress }: VideoCardProps) {
  const [watchProgress, setWatchProgress] = useState<number>(0);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLive) {
      const videoId = (item as TwitchVideo).id;
      const saved = localStorage.getItem(`watch_progress_${videoId}`);
      if (saved) {
        setWatchProgress(parseFloat(saved));
      }
    }
  }, [item, isLive]);

  const thumbnail = isLive 
    ? getThumbnailUrl((item as TwitchStream).thumbnail_url)
    : getThumbnailUrl((item as TwitchVideo).thumbnail_url);

  const title = isLive ? (item as TwitchStream).title : (item as TwitchVideo).title;
  const userName = isLive ? (item as TwitchStream).user_name : (item as TwitchVideo).user_name;
  const viewerCount = isLive ? (item as TwitchStream).viewer_count : (item as TwitchVideo).view_count;
  const gameName = isLive ? (item as TwitchStream).game_name : undefined;
  const createdAt = !isLive ? (item as TwitchVideo).created_at : undefined;

  return (
    <div 
      onClick={onClick}
      className={`group cursor-pointer rounded-lg overflow-hidden bg-twitch-gray hover:bg-gray-700 transition-colors ${
        isLive ? 'animate-glow-pulse' : ''
      }`}
    >
      <div className={`relative aspect-video ${isLive ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-twitch-dark' : ''}`}>
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        {isLive && <LiveBadge viewerCount={viewerCount} />}
        {!isLive && (
          <>
            <div className="absolute bottom-2 right-2 px-2 py-0.5 text-xs font-medium bg-black/70 text-white rounded">
              {formatTimeAgo(createdAt || '')}
            </div>
            {watchProgress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                <div 
                  className="h-full bg-red-600"
                  style={{ width: `${Math.min(watchProgress, 100)}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-white font-medium line-clamp-2 group-hover:text-twitch-purple transition-colors">
          {title}
        </h3>
        <p className="text-gray-400 text-sm mt-1">{userName}</p>
        {gameName && (
          <p className="text-gray-500 text-sm">{gameName}</p>
        )}
        {!isLive && (
          <p className="text-gray-500 text-sm">{formatViewCount(viewerCount)} views</p>
        )}
      </div>
    </div>
  );
}
