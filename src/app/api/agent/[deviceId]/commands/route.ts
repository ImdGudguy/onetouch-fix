import { NextResponse } from 'next/server';
import { takeQueuedCommands } from '@/lib/db';
import { agentUnauthorized } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  const denied = agentUnauthorized(req);
  if (denied) return denied;
  const { deviceId } = await params;
  const commands = takeQueuedCommands(deviceId);
  return NextResponse.json(commands);
}
