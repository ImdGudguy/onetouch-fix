import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { getUser } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin-only: returns the one-line enrollment command (site URL + token baked in)
// and the bundle download URL. Gated by middleware + this role check so the
// shared agent token is only revealed to an authenticated admin.
export async function GET() {
  const username = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!username) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const user = await getUser(username);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  const origin = `${proto}://${host}`;
  const token = process.env.INTELLIFIX_AGENT_TOKEN || '';

  const oneLiner = `powershell -ExecutionPolicy Bypass -Command "irm '${origin}/api/agent/install.ps1?backend=${origin}&token=${token}' | iex"`;

  return NextResponse.json({ origin, hasToken: !!token, downloadUrl: `${origin}/api/agent/download`, oneLiner });
}
