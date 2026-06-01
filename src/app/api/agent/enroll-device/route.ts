import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { consumeEnrollment, addDeviceToken } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// Public: the agent redeems a single-use enrollment token for a long-lived,
// per-device token. The enrollment token is burned on success.
export async function POST(req: Request) {
  const { enrollToken, deviceId } = await req.json().catch(() => ({}));
  if (!enrollToken || !deviceId) return NextResponse.json({ error: 'enrollToken and deviceId required' }, { status: 400 });

  const ok = await consumeEnrollment(sha256(String(enrollToken)));
  if (!ok) return NextResponse.json({ error: 'Invalid or expired enrollment token.' }, { status: 401 });

  const deviceToken = randomBytes(32).toString('hex');
  await addDeviceToken(sha256(deviceToken), String(deviceId));
  return NextResponse.json({ deviceToken });
}
