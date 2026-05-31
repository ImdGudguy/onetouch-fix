import { NextResponse } from 'next/server';
import { listDevices } from '@/lib/store';
import { mapDevice, fleetSummary } from '@/lib/map';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const devices = (await listDevices()).map(mapDevice);
  return NextResponse.json({ devices, fleetSummary: fleetSummary(devices) });
}
