import { NextResponse } from 'next/server';
import { getCommandStatus } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Live status of a queued remediation so the dashboard can show a one-line,
// continuously-updating progress message while the agent works.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = await getCommandStatus(id);
  if (!status) return NextResponse.json({ status: 'unknown' }, { status: 404 });
  return NextResponse.json(status);
}
