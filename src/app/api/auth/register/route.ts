import { NextResponse } from 'next/server';
import { getUser, getUserByEmail, createUser, userCount } from '@/lib/store';
import { hashPassword } from '@/lib/password';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  const { username, email, password, acceptTerms } = await req.json().catch(() => ({}));
  if (!username || !email || !password) return NextResponse.json({ error: 'Username, email and password are required.' }, { status: 400 });
  if (!acceptTerms) return NextResponse.json({ error: 'You must accept the Terms & Privacy Policy.' }, { status: 400 });

  const uname = String(username).trim();
  const mail = String(email).trim();
  if (uname.length < 3) return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
  if (!EMAIL_RE.test(mail)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });

  if (await getUser(uname)) return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
  if (await getUserByEmail(mail)) return NextResponse.json({ error: 'That email is already registered.' }, { status: 409 });

  // First account becomes the admin.
  const role = (await userCount()) === 0 ? 'admin' : 'user';
  const { salt, hash } = hashPassword(String(password));
  await createUser({ username: uname, email: mail, salt, hash, role, createdAt: new Date().toISOString() });

  const token = await createSessionToken(uname);
  const res = NextResponse.json({ ok: true, username: uname, role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400, secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
