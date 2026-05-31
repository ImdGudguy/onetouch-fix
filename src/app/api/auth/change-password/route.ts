import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { getUser, updateUserPassword } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/password';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const username = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!username) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Current and new password are required.' }, { status: 400 });
  if (String(newPassword).length < 6) return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });

  const user = getUser(username);
  if (!user || !verifyPassword(String(currentPassword), user.salt, user.hash)) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  const { salt, hash } = hashPassword(String(newPassword));
  updateUserPassword(username, salt, hash);
  return NextResponse.json({ ok: true });
}
