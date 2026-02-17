import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

export async function GET() {
  logout();
  return NextResponse.redirect('http://localhost:3000/');
}
