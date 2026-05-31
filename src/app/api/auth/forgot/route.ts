import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getUser, getUserByEmail, setOtp } from '@/lib/store';
import { sendOtpEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function POST(req: Request) {
  const { identifier } = await req.json().catch(() => ({}));
  if (!identifier) return NextResponse.json({ error: 'Enter your username or email.' }, { status: 400 });

  const id = String(identifier).trim();
  const user = (await getUser(id)) || (await getUserByEmail(id));

  // Always respond ok to avoid leaking which accounts exist.
  if (!user || !user.email) return NextResponse.json({ ok: true, sent: true });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await setOtp(user.username, { hash: sha256(code), exp: Date.now() + 10 * 60_000 });
  const r = await sendOtpEmail(user.email, code);

  return NextResponse.json({ ok: true, sent: true, ...(r.devCode ? { devCode: r.devCode } : {}) });
}
