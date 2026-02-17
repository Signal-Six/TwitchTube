import { NextResponse } from 'next/server';
import { getAuthState } from '@/lib/auth';

export async function GET() {
  const authState = await getAuthState();
  
  return NextResponse.json({
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
  });
}
