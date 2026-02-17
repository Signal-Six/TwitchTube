'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  email?: string;
}

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [user, setUser] = useState<TwitchUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
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

        <div className="flex-1 max-w-md mx-8">
          <input
            type="text"
            placeholder="Search streamers..."
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-full px-4 py-2 bg-twitch-gray text-white rounded-lg border border-gray-700 focus:outline-none focus:border-twitch-purple placeholder-gray-500"
          />
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
