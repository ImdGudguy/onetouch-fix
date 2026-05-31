import { NextResponse } from 'next/server';
import { enqueueCommand } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The web confirm popup is the consent gate; on "Yes" we queue a command
// that the agent picks up, (optionally re-confirms on the PC) and executes.
export async function POST(req: Request) {
  try {
    const { deviceId, actionType } = await req.json();
    if (!deviceId || !actionType) {
      return NextResponse.json({ success: false, error: 'deviceId and actionType required' }, { status: 400 });
    }
    const id = await enqueueCommand(deviceId, actionType);
    return NextResponse.json({ success: true, queued: true, commandId: id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? 'bad request' }, { status: 400 });
  }
}
