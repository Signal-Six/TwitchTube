import { cookies } from 'next/headers';

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export interface TwitchTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string[];
}

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  email?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: TwitchUser | null;
  accessToken: string | null;
}

function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getLoginUrl(): string {
  const state = generateState();
  const scopes = ['user:read:follows'].join(' ');
  
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: `${NEXTAUTH_URL}/api/auth/callback`,
    response_type: 'code',
    scope: scopes,
    state: state,
    force_verify: 'true',
  });

  cookies().set('twitch_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });

  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, state: string): Promise<TwitchTokens | null> {
  const storedState = cookies().get('twitch_oauth_state')?.value;
  
  if (!storedState || storedState !== state) {
    console.error('State mismatch:', storedState, state);
    return null;
  }

  cookies().delete('twitch_oauth_state');

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: `${NEXTAUTH_URL}/api/auth/callback`,
  });

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token exchange failed:', error);
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: Array.isArray(data.scope) ? data.scope : (data.scope ? data.scope.split(' ') : []),
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TwitchTokens | null> {
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: Array.isArray(data.scope) ? data.scope : (data.scope ? data.scope.split(' ') : []),
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

export async function getTwitchUser(accessToken: string): Promise<TwitchUser | null> {
  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0];
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

export async function getAuthState(): Promise<AuthState> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('twitch_access_token')?.value;
  const refreshToken = cookieStore.get('twitch_refresh_token')?.value;

  if (!accessToken || !refreshToken) {
    return { isAuthenticated: false, user: null, accessToken: null };
  }

  const user = await getTwitchUser(accessToken);
  
  if (!user) {
    if (refreshToken) {
      const newTokens = await refreshAccessToken(refreshToken);
      if (newTokens) {
        cookieStore.set('twitch_access_token', newTokens.access_token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: newTokens.expires_in,
        });
        cookieStore.set('twitch_refresh_token', newTokens.refresh_token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });
        
        const refreshedUser = await getTwitchUser(newTokens.access_token);
        return {
          isAuthenticated: true,
          user: refreshedUser,
          accessToken: newTokens.access_token,
        };
      }
    }
    return { isAuthenticated: false, user: null, accessToken: null };
  }

  return {
    isAuthenticated: true,
    user,
    accessToken,
  };
}

export function logout(): void {
  cookies().delete('twitch_access_token');
  cookies().delete('twitch_refresh_token');
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('twitch_access_token')?.value;
  const refreshToken = cookieStore.get('twitch_refresh_token')?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    if (response.ok) {
      return accessToken;
    }

    if (response.status === 401 && refreshToken) {
      const newTokens = await refreshAccessToken(refreshToken);
      if (newTokens) {
        cookieStore.set('twitch_access_token', newTokens.access_token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: newTokens.expires_in,
        });
        cookieStore.set('twitch_refresh_token', newTokens.refresh_token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });
        return newTokens.access_token;
      }
    }
  } catch (error) {
    console.error('Error validating token:', error);
  }

  return null;
}
