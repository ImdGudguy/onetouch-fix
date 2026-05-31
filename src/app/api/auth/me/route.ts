import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { getUser } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const username = await verifySessionToken(token);
  if (!username) return NextResponse.json({ authenticated: false }, { status: 401 });
  // A signed cookie can outlive its user (deleted/reset). Treat that as logged out.
  const user = await getUser(username);
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, username, role: user.role });
}
