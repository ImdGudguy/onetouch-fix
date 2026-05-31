import { NextResponse } from 'next/server';
import { userCount } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public: lets the login page show a "create the first admin account" state.
export async function GET() {
  return NextResponse.json({ hasUsers: userCount() > 0 });
}
