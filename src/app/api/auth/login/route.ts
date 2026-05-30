import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });

  const user = getUser(String(username).trim());
  // Verify even when the user is missing-ish to keep timing uniform.
  const ok = user ? verifyPassword(String(password), user.salt, user.hash) : false;
  if (!user || !ok) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });

  const token = await createSessionToken(user.username);
  const res = NextResponse.json({ ok: true, username: user.username });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400, secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
