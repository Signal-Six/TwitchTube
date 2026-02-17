'use client';

import { TwitchStream, TwitchVideo } from '@/types';
import { VideoCard } from './VideoCard';

interface StreamGridProps {
  liveStreams: TwitchStream[];
  videos: TwitchVideo[];
  selectedCategory: string | null;
  onVideoClick: (video: TwitchStream | TwitchVideo) => void;
}

export function StreamGrid({ liveStreams, videos, selectedCategory, onVideoClick }: StreamGridProps) {
  const filteredLive = selectedCategory === 'live' || selectedCategory === null
    ? liveStreams
    : selectedCategory
    ? liveStreams.filter(s => s.game_id === selectedCategory)
    : [];

  const filteredVideos = selectedCategory
    ? videos.filter(v => v.game_id === selectedCategory)
    : videos;

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (b.view_count !== a.view_count) {
      return b.view_count - a.view_count;
    }
    if (selectedCategory) {
      const aGame = a.game_id;
      const bGame = b.game_id;
      if (aGame === selectedCategory && bGame !== selectedCategory) return -1;
      if (bGame === selectedCategory && aGame !== selectedCategory) return 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (filteredLive.length === 0 && sortedVideos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-lg">No content found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {filteredLive.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Live Now
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLive.map((stream) => (
              <VideoCard
                key={stream.id}
                item={stream}
                isLive={true}
                onClick={() => onVideoClick(stream)}
              />
            ))}
          </div>
        </section>
      )}

      {sortedVideos.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Recent VODs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedVideos.map((video) => (
              <VideoCard
                key={video.id}
                item={video}
                isLive={false}
                onClick={() => onVideoClick(video)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
