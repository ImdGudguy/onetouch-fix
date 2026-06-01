import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { getUser, createEnrollment } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const TTL_MIN = 15;

// Admin-only: mints a single-use, short-lived ENROLLMENT token (not the device
// token, not the shared secret) and returns a personalized one-line installer.
// A leaked enrollment token is useless after 15 minutes / one use.
export async function GET() {
  const username = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!username) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const user = await getUser(username);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  const origin = `${proto}://${host}`;

  const enrollToken = randomBytes(24).toString('hex');
  await createEnrollment(sha256(enrollToken), Date.now() + TTL_MIN * 60_000);

  const oneLiner = `powershell -ExecutionPolicy Bypass -Command "irm '${origin}/api/agent/install.ps1?backend=${origin}&enroll=${enrollToken}' | iex"`;

  return NextResponse.json({
    origin,
    oneLiner,
    downloadUrl: `${origin}/api/agent/download`,
    enrollToken,
    expiresInMinutes: TTL_MIN,
  });
}
