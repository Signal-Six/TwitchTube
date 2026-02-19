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

interface SearchChannelResult {
  broadcaster_id: string;
  broadcaster_login: string;
  display_name: string;
  game_id: string;
  game_name: string;
  is_live: boolean;
  thumbnail_url: string;
  title: string;
}

interface SearchCategoryResult {
  id: string;
  name: string;
  box_art_url: string;
}

interface SearchResultsResponse {
  data: SearchChannelResult[] | SearchCategoryResult[];
  pagination: string;
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

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TwitchStream | TwitchVideo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Followed content state
  const [videos, setVideos] = useState<TwitchVideo[]>([]);
  const [pagination, setPagination] = useState<Record<string, string>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'channels' | 'categories'>('channels');
  const [searchResults, setSearchResults] = useState<SearchChannelResult[] | SearchCategoryResult[]>([]);
  const [searchPagination, setSearchPagination] = useState('');
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  
  // Selected channel state (for filtering by specific channel)
  const [selectedChannel, setSelectedChannel] = useState<{ broadcaster_id: string; broadcaster_login: string; broadcaster_name: string } | null>(null);
  
  // Ref for Header search input
  const searchInputRef = useRef<{ clear: () => void } | null>(null);
  
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
    isAuthenticated && followedData && !isSearching && !selectedCategory && !selectedChannel ? 
      `/api/videos?userId=${followedData.map(c => c.broadcaster_id).join(',')}&limit=25` : 
    isAuthenticated && selectedChannel ?
      `/api/videos?userId=${selectedChannel.broadcaster_id}&limit=25` :
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

  const liveStreams = useMemo(() => {
    if (!streamsData) return [];
    return streamsData;
  }, [streamsData]);

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
      const userId = selectedChannel ? selectedChannel.broadcaster_id : followedData.map(c => c.broadcaster_id).join(',');
      const response = await fetch(
        `/api/videos?userId=${userId}&limit=25&cursor=${cursorParam}`
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
  }, [loadingMore, hasMore, pagination, followedData, selectedChannel]);

  const handleSearch = useCallback(async (query: string, type: 'channels' | 'categories') => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSearchQuery(query);
    setSearchType(type);
    setSearchResults([]);
    setSearchPagination('');
    setSearchHasMore(true);
    setSelectedChannel(null);
    
    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(query)}&type=${type}&limit=25`
      );
      
      if (response.ok) {
        const data: SearchResultsResponse = await response.json();
        setSearchResults(data.data);
        setSearchPagination(data.pagination);
        setSearchHasMore(!!data.pagination);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }, []);

  const handleSelectChannel = useCallback(async (channel: { broadcaster_id?: string; broadcaster_login: string; broadcaster_name: string }) => {
    let broadcasterId = channel.broadcaster_id;
    
    if (!broadcasterId) {
      try {
        const response = await fetch(`/api/user?login=${encodeURIComponent(channel.broadcaster_login)}`);
        if (response.ok) {
          const userData = await response.json();
          broadcasterId = userData.id;
        }
      } catch (error) {
        console.error('Error resolving user ID:', error);
      }
    }
    
    if (broadcasterId) {
      setSelectedChannel({
        broadcaster_id: broadcasterId,
        broadcaster_login: channel.broadcaster_login,
        broadcaster_name: channel.broadcaster_name,
      });
      setIsSearching(false);
      setSearchQuery('');
      setSearchResults([]);
      searchInputRef.current?.clear();
    }
  }, []);

  const handleSelectCategory = useCallback((categoryName: string) => {
    setSelectedCategory(categoryName);
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.clear();
  }, []);

  const loadMoreSearchResults = useCallback(async () => {
    if (searchLoadingMore || !searchHasMore || !searchQuery) return;
    
    setSearchLoadingMore(true);
    
    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(searchQuery)}&type=${searchType}&limit=25&cursor=${searchPagination}`
      );
      
      if (response.ok) {
        const data: SearchResultsResponse = await response.json();
        setSearchResults(prev => [...prev, ...(data.data as any[])]);
        setSearchPagination(data.pagination);
        setSearchHasMore(!!data.pagination);
      }
    } catch (error) {
      console.error('Error loading more search results:', error);
    } finally {
      setSearchLoadingMore(false);
    }
  }, [searchLoadingMore, searchHasMore, searchQuery, searchType, searchPagination]);

  const clearSearch = useCallback(() => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchPagination('');
    setSelectedChannel(null);
    searchInputRef.current?.clear();
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (isSearching) {
            loadMoreSearchResults();
          } else {
            loadMoreVideos();
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [isSearching, loadMoreSearchResults, loadMoreVideos]);

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
        <Header followedChannels={followedData} />
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
        <Header 
          onSearch={handleSearch} 
          followedChannels={followedData}
          searchType={searchType}
        />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-white text-xl">Loading your content...</div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-twitch-dark">
        <Header 
          onSearch={handleSearch} 
          followedChannels={followedData}
          searchType={searchType}
        />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-red-500 text-xl">Error loading content. Please try again.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-twitch-dark">
      <Header 
        onSearch={handleSearch} 
        followedChannels={followedData}
        searchType={searchType}
        searchInputRef={searchInputRef}
      />
      
      {isSearching || selectedChannel ? (
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={clearSearch}
              className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Back to Followed
            </button>
            {selectedChannel ? (
              <h2 className="text-xl font-bold text-white">
                {selectedChannel.broadcaster_name}'s Content
              </h2>
            ) : (
              <h2 className="text-xl font-bold text-white">
                Search Results for "{searchQuery}" 
                <span className="text-gray-400 text-base font-normal ml-2">
                  ({searchType === 'channels' ? 'Channels' : 'Categories'})
                </span>
              </h2>
            )}
          </div>
          
          {isSearching && (
            <>
              {searchType === 'channels' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(searchResults as SearchChannelResult[]).map(channel => (
                    <SearchChannelCard 
                      key={channel.broadcaster_id} 
                      channel={channel} 
                      onClick={() => handleSelectChannel({ 
                        broadcaster_id: channel.broadcaster_id, 
                        broadcaster_login: channel.broadcaster_login,
                        broadcaster_name: channel.display_name 
                      })}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(searchResults as SearchCategoryResult[]).map(category => (
                    <SearchCategoryCard 
                      key={category.id} 
                      category={category} 
                      onClick={() => handleSelectCategory(category.name)}
                    />
                  ))}
                </div>
              )}
              
              {searchResults.length === 0 && (
                <div className="text-gray-400 text-center py-8">No results found</div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}

      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {(isSearching ? searchLoadingMore : loadingMore) && (
          <div className="text-gray-400">Loading more...</div>
        )}
        {!isSearching && !hasMore && videos.length > 0 && (
          <div className="text-gray-500">No more VODs to load</div>
        )}
        {isSearching && !searchHasMore && searchResults.length > 0 && (
          <div className="text-gray-500">No more results</div>
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

function SearchChannelCard({ 
  channel, 
  onClick 
}: { 
  channel: SearchChannelResult; 
  onClick: () => void;
}) {
  const thumbnail = channel.thumbnail_url
    .replace('{width}', '320')
    .replace('{height}', '180');

  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer rounded-lg overflow-hidden bg-twitch-gray hover:bg-gray-700 transition-colors"
    >
      <div className="relative aspect-video">
        {channel.is_live ? (
          <>
            <img
              src={thumbnail}
              alt={channel.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">LIVE</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-400">Offline</span>
          </div>
        )}
      </div>
      <div className="p-3 flex items-start gap-3">
        <img
          src={thumbnail.replace('320', '70').replace('180', '70')}
          alt={channel.display_name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-1"
        />
        <div className="min-w-0">
          <h3 className="text-white font-medium line-clamp-2 group-hover:text-twitch-purple transition-colors">
            {channel.display_name}
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {channel.is_live ? channel.game_name : 'Last playing: ' + channel.game_name}
          </p>
          {channel.is_live && (
            <p className="text-gray-500 text-sm line-clamp-1">{channel.title}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchCategoryCard({ 
  category, 
  onClick 
}: { 
  category: SearchCategoryResult; 
  onClick: () => void;
}) {
  const thumbnail = category.box_art_url
    .replace('{width}', '320')
    .replace('{height}', '180');

  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer rounded-lg overflow-hidden bg-twitch-gray hover:bg-gray-700 transition-colors"
    >
      <div className="relative aspect-video">
        <img
          src={thumbnail}
          alt={category.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className="text-white font-medium line-clamp-2 group-hover:text-twitch-purple transition-colors">
          {category.name}
        </h3>
      </div>
    </div>
  );
}
