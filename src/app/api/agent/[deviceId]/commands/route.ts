import { NextResponse } from 'next/server';
import { takeQueuedCommands } from '@/lib/store';
import { agentUnauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const denied = await agentUnauthorized(req);
  if (denied) return denied;
  const { deviceId } = await params;
  const commands = await takeQueuedCommands(deviceId);
  return NextResponse.json(commands);
}
