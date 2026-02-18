'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface FollowedChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  profile_image_url: string;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  email?: string;
}

interface HeaderProps {
  onSearch?: (query: string, type: 'channels' | 'categories') => void;
  followedChannels?: FollowedChannel[];
  searchType?: 'channels' | 'categories';
}

export function Header({ onSearch, followedChannels = [], searchType = 'channels' }: HeaderProps) {
  const [user, setUser] = useState<TwitchUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTypeLocal, setSearchTypeLocal] = useState<'channels' | 'categories'>(searchType);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<FollowedChannel[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchInput.length >= 3 && followedChannels.length > 0) {
      const filtered = followedChannels.filter(channel =>
        channel.broadcaster_name.toLowerCase().includes(searchInput.toLowerCase()) ||
        channel.broadcaster_login.toLowerCase().includes(searchInput.toLowerCase())
      ).slice(0, 5);
      setAutocompleteResults(filtered);
      setShowAutocomplete(filtered.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  }, [searchInput, followedChannels]);

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowAutocomplete(false);
      onSearch?.(searchInput, searchTypeLocal);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  const handleAutocompleteClick = (channel: FollowedChannel) => {
    setSearchInput(channel.broadcaster_name);
    setShowAutocomplete(false);
    onSearch?.(channel.broadcaster_name, 'channels');
  };

  const handleSearchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchTypeLocal(e.target.value as 'channels' | 'categories');
  };

  return (
    <header className="sticky top-0 z-50 bg-twitch-dark border-b border-gray-800">
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-twitch-purple rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">TwitchTube</h1>
        </Link>

        <div className="flex-1 max-w-xl mx-8 relative" ref={searchRef}>
          <div className="flex">
            <select
              value={searchTypeLocal}
              onChange={handleSearchTypeChange}
              className="px-3 py-2 bg-twitch-gray text-white border border-gray-700 border-r-0 rounded-l-lg focus:outline-none text-sm"
            >
              <option value="channels">Channels</option>
              <option value="categories">Categories</option>
            </select>
            <input
              type="text"
              placeholder={searchTypeLocal === 'channels' ? "Search channels..." : "Search categories..."}
              value={searchInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchInput.length >= 3 && autocompleteResults.length > 0) {
                  setShowAutocomplete(true);
                }
              }}
              className="flex-1 px-4 py-2 bg-twitch-gray text-white rounded-r-lg border border-gray-700 focus:outline-none focus:border-twitch-purple placeholder-gray-500"
            />
          </div>
          
          {showAutocomplete && autocompleteResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-twitch-gray border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
              {autocompleteResults.map(channel => (
                <button
                  key={channel.broadcaster_id}
                  onClick={() => handleAutocompleteClick(channel)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  {channel.profile_image_url && (
                    <Image
                      src={channel.profile_image_url}
                      alt={channel.broadcaster_name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-white">{channel.broadcaster_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {user.profile_image_url && (
                  <Image
                    src={user.profile_image_url}
                    alt={user.display_name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <span className="text-white">{user.display_name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 text-sm bg-twitch-purple text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Connect Twitch
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
