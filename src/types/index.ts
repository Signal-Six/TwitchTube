export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

export interface FollowedChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  followed_at: string;
  profile_image_url?: string;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: 'live' | '';
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
  profile_image_url?: string;
  tag_ids: string[];
  is_mature: boolean;
}

export interface TwitchVideo {
  id: string;
  stream_id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  title: string;
  description: string;
  created_at: string;
  published_at: string;
  url: string;
  thumbnail_url: string;
  viewable: 'public' | 'private';
  view_count: number;
  language: string;
  duration: string;
  muted_segments: { start_offset: number; end_offset: number }[];
  game_id?: string;
  watchProgress?: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string;
}
