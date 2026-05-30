import { NextResponse } from 'next/server';
import { upsertDevice } from '@/lib/db';
import { agentUnauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const denied = agentUnauthorized(req);
  if (denied) return denied;
  try {
    const snapshot = await req.json();
    upsertDevice(snapshot);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'bad request' }, { status: 400 });
  }
}
