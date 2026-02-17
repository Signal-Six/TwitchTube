'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <span className="text-gray-400">Loading...</span>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-gray-300">Signed in as {session.user?.name}</span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('twitch')}
      className="px-4 py-2 text-sm bg-twitch-purple text-white rounded-lg hover:bg-purple-700 transition-colors"
    >
      Sign in with Twitch
    </button>
  );
}
