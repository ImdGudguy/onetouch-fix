import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { getUser } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const username = await verifySessionToken(token);
  if (!username) return NextResponse.json({ authenticated: false }, { status: 401 });
  const role = getUser(username)?.role ?? 'user';
  return NextResponse.json({ authenticated: true, username, role });
}
