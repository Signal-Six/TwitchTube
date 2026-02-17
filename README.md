# TwitchTube

A YouTube-style interface for viewing your followed Twitch streamers. Watch live streams and archived VODs organized by your follow list.

## Features

- **Twitch OAuth Integration** - Sign in with your Twitch account
- **Live Streams** - View your followed streamers who are currently live with a red glowing border
- **VODs** - Browse archived streams from your followed channels
- **Category Filtering** - Filter by game/category from your followed list
- **Search** - Filter streamers by name
- **Embedded Player** - Watch streams/VODs directly in the app
- **Caching** - Redis caching via Upstash for optimal performance

## Prerequisites

- Node.js 18+
- Twitch Developer Account (https://dev.twitch.tv/console)
- Upstash Account (https://upstash.com) for Redis caching

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**

Copy `.env.example` to `.env.local` and fill in your credentials:

```env
# Twitch API (get from https://dev.twitch.tv/console)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Upstash Redis (get from https://upstash.com)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

3. **Register your Twitch Application:**

   - Go to https://dev.twitch.tv/console
   - Create a new application
   - Set OAuth Redirect URL to: `http://localhost:3000/api/auth/callback/twitch`
   - Copy your Client ID and Client Secret to `.env.local`

4. **Run development server:**
```bash
npm run dev
```

5. **Open http://localhost:3000**

## Deployment to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables in Vercel dashboard:
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
   - `NEXTAUTH_URL` (set to your Vercel domain)
   - `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- NextAuth.js with Twitch Provider
- Upstash Redis for caching
- Tailwind CSS
- SWR for data fetching
