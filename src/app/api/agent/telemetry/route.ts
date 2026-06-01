import { NextResponse } from 'next/server';
import { upsertDevice } from '@/lib/store';
import { agentUnauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const denied = await agentUnauthorized(req);
  if (denied) return denied;
  try {
    const snapshot = await req.json();
    await upsertDevice(snapshot);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'bad request' }, { status: 400 });
  }
}
