import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins - restrict to your specific domain(s)
const allowedOrigins = [
  'https://twitch-tube.vercel.app',
  'http://localhost:3000', // For local development
];

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply CORS to API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Get the origin from the request headers
  const origin = request.headers.get('origin');

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });

    // Set CORS headers for preflight
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Set the specific origin if allowed, otherwise don't set (browser will block)
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    return response;
  }

  // Handle actual requests
  const response = NextResponse.next();

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Set the specific origin if allowed
  // If origin is not in allowed list, the browser will block the request
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  return response;
}

// Configure middleware to run on API routes
export const config = {
  matcher: '/api/:path*',
};
