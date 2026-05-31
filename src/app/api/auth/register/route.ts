import { NextResponse } from 'next/server';
import { getUser, createUser, userCount } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  if (String(username).trim().length < 3) return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
  if (String(password).length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

  const uname = String(username).trim();
  if (getUser(uname)) return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });

  // First account to be created becomes the admin.
  const role = userCount() === 0 ? 'admin' : 'user';
  const { salt, hash } = hashPassword(String(password));
  createUser(uname, salt, hash, role);

  const token = await createSessionToken(uname);
  const res = NextResponse.json({ ok: true, username: uname, role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400, secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
