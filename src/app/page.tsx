'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { StreamGrid } from './components/StreamGrid';
import { TwitchStream, TwitchVideo, FollowedChannel, Category } from '@/types';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
});

interface AuthSession {
  isAuthenticated: boolean;
  user: {
    id: string;
    login: string;
    display_name: string;
    profile_image_url: string;
  } | null;
}

interface VideosResponse {
  videos: TwitchVideo[];
  pagination: Record<string, string>;
}

function VideoPlayerWithProgress({ 
  videoId, 
  onProgressUpdate 
}: { 
  videoId: string; 
  onProgressUpdate: (progress: number) => void;
}) {
  const [initialProgress, setInitialProgress] = useState<number>(0);
  const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`watch_progress_${videoId}`);
      if (saved) {
        setInitialProgress(parseFloat(saved));
      }
    }
  }, [videoId]);

  const startTime = initialProgress > 0 ? `&start=${Math.floor(initialProgress * 60)}` : '';

  return (
    <iframe
      src={`https://player.twitch.tv/?video=${videoId}${startTime}&parent=${parentDomain}&muted=false`}
      className="w-full h-full rounded-lg"
      allowFullScreen
    />
  );
}

function getWatchProgress(videoId: string): number {
  if (typeof window === 'undefined') return 0;
  const progress = localStorage.getItem(`watch_progress_${videoId}`);
  return progress ? parseFloat(progress) : 0;
}

function saveWatchProgress(videoId: string, progress: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`watch_progress_${videoId}`, progress.toString());
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TwitchStream | TwitchVideo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [videos, setVideos] = useState<TwitchVideo[]>([]);
  const [pagination, setPagination] = useState<Record<string, string>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then((data: AuthSession) => {
        setIsAuthenticated(data.isAuthenticated);
        setAuthLoading(false);
      })
      .catch(() => {
        setAuthLoading(false);
      });
  }, []);

  const { data: followedData, error: followedError } = useSWR<FollowedChannel[]>(
    isAuthenticated ? '/api/followed' : null,
    fetcher,
    { refreshInterval: 300000, revalidateOnFocus: false }
  );

  const { data: streamsData, error: streamsError } = useSWR<TwitchStream[]>(
    isAuthenticated ? '/api/streams' : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  );

  const { data: initialVideosData, error: videosError } = useSWR<VideosResponse>(
    isAuthenticated && followedData ? 
      `/api/videos?userId=${followedData.map(c => c.broadcaster_id).join(',')}&limit=25` : 
      null,
    fetcher,
    { 
      refreshInterval: 120000, 
      revalidateOnFocus: false,
      onSuccess: (data) => {
        setVideos(data.videos);
        setPagination(data.pagination);
        setHasMore(Object.keys(data.pagination).length > 0);
      }
    }
  );

  const categories = useMemo(() => {
    const categoryMap = new Map<string, Category>();
    
    if (streamsData) {
      streamsData.forEach(stream => {
        if (!categoryMap.has(stream.game_id)) {
          categoryMap.set(stream.game_id, { id: stream.game_id, name: stream.game_name });
        }
      });
    }
    
    return Array.from(categoryMap.values());
  }, [streamsData]);

  const filteredFollowed = useMemo(() => {
    if (!followedData) return [];
    if (!searchQuery) return followedData;
    return followedData.filter(c => 
      c.broadcaster_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [followedData, searchQuery]);

  const liveStreams = useMemo(() => {
    if (!streamsData || !filteredFollowed) return [];
    return streamsData;
  }, [streamsData, filteredFollowed]);

  const videosWithProgress = useMemo(() => {
    return videos.map(v => ({
      ...v,
      game_id: v.game_id || 'unknown',
      watchProgress: getWatchProgress(v.id),
    }));
  }, [videos]);

  const loadMoreVideos = useCallback(async () => {
    if (loadingMore || !hasMore || !followedData) return;
    
    setLoadingMore(true);
    
    try {
      const cursorParam = encodeURIComponent(JSON.stringify(pagination));
      const response = await fetch(
        `/api/videos?userId=${followedData.map(c => c.broadcaster_id).join(',')}&limit=25&cursor=${cursorParam}`
      );
      
      if (response.ok) {
        const data: VideosResponse = await response.json();
        setVideos(prev => {
          const existingIds = new Set(prev.map(v => v.id));
          const newVideos = data.videos.filter(v => !existingIds.has(v.id));
          return [...prev, ...newVideos];
        });
        setPagination(data.pagination);
        setHasMore(Object.keys(data.pagination).length > 0);
      }
    } catch (error) {
      console.error('Error loading more videos:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, pagination, followedData]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loadMoreVideos, hasMore, loadingMore]);

  const handleVideoClick = (video: TwitchStream | TwitchVideo) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    if (selectedVideo && 'id' in selectedVideo && !('type' in selectedVideo && selectedVideo.type === 'live')) {
      const videoId = selectedVideo.id;
      const savedProgress = localStorage.getItem(`watch_progress_${videoId}`);
      const currentProgress = savedProgress ? parseFloat(savedProgress) : 0;
      
      if (currentProgress > 0 && currentProgress < 95) {
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, watchProgress: currentProgress } : v
        ));
      }
    }
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-twitch-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-twitch-dark">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="text-center max-w-lg">
            <h1 className="text-4xl font-bold text-white mb-4">Welcome to TwitchTube</h1>
            <p className="text-gray-400 text-lg mb-8">
              Connect your Twitch account to view your followed streamers in a YouTube-style interface. 
              Watch live streams and archived VODs all in one place.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = !followedData && !followedError;
  const hasError = followedError || streamsError || videosError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-twitch-dark">
        <Header onSearch={setSearchQuery} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-white text-xl">Loading your content...</div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-twitch-dark">
        <Header onSearch={setSearchQuery} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-red-500 text-xl">Error loading content. Please try again.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-twitch-dark">
      <Header onSearch={setSearchQuery} />
      <CategoryTabs 
        categories={categories} 
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <StreamGrid
        liveStreams={liveStreams}
        videos={videosWithProgress}
        selectedCategory={selectedCategory}
        onVideoClick={handleVideoClick}
      />

      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {loadingMore && (
          <div className="text-gray-400">Loading more...</div>
        )}
        {!hasMore && videos.length > 0 && (
          <div className="text-gray-500">No more VODs to load</div>
        )}
      </div>

      {showVideoModal && selectedVideo && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={closeVideoModal}
        >
          <div className="w-full max-w-5xl aspect-video relative" onClick={e => e.stopPropagation()}>
            {'type' in selectedVideo && selectedVideo.type === 'live' ? (
              <iframe
                src={`https://player.twitch.tv/?channel=${selectedVideo.user_name}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&muted=false`}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            ) : (
              <VideoPlayerWithProgress
                videoId={selectedVideo.id}
                onProgressUpdate={(progress) => {
                  const videoId = selectedVideo.id;
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`watch_progress_${videoId}`, progress.toString());
                    setVideos(prev => prev.map(v => 
                      v.id === videoId ? { ...v, watchProgress: progress } : v
                    ));
                  }
                }}
              />
            )}
            <button
              onClick={closeVideoModal}
              className="absolute -top-10 right-0 text-white text-xl hover:text-gray-300"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
