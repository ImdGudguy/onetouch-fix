import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getUser, getUserByEmail, getOtp, clearOtp, updateUserPassword } from '@/lib/store';
import { hashPassword } from '@/lib/password';
import { lockRemainingSeconds, recordFailure, resetFailures, clientKey } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function POST(req: Request) {
  const { identifier, code, newPassword } = await req.json().catch(() => ({}));
  if (!identifier || !code || !newPassword) return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  if (String(newPassword).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });

  const key = clientKey(req, `reset:${String(identifier)}`);
  const wait = lockRemainingSeconds(key);
  if (wait > 0) return NextResponse.json({ error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` }, { status: 429 });

  const id = String(identifier).trim();
  const user = (await getUser(id)) || (await getUserByEmail(id));
  const otp = user ? await getOtp(user.username) : undefined;

  if (!user || !otp || otp.exp < Date.now() || otp.hash !== sha256(String(code))) {
    recordFailure(key);
    return NextResponse.json({ error: 'Invalid or expired reset code.' }, { status: 400 });
  }

  resetFailures(key);
  const { salt, hash } = hashPassword(String(newPassword));
  await updateUserPassword(user.username, salt, hash);
  await clearOtp(user.username);
  return NextResponse.json({ ok: true });
}
