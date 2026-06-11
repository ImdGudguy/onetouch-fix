import { NextResponse } from 'next/server';
import { takeQueuedCommands } from '@/lib/store';
import { agentUnauthorized, agentDeviceMismatch } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const denied = await agentUnauthorized(req);
  if (denied) return denied;
  const { deviceId } = await params;
  // A per-device token may only pull its own device's commands.
  const mismatch = await agentDeviceMismatch(req, deviceId);
  if (mismatch) return mismatch;
  const commands = await takeQueuedCommands(deviceId);
  return NextResponse.json(commands);
}
