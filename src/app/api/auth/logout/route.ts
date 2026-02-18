import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

export async function GET() {
  logout();
  return NextResponse.redirect('https://twitch-tube.vercel.app/');
}
