import { NextResponse } from 'next/server';
import { listDevices } from '@/lib/db';
import { mapDevice } from '@/lib/map';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Returns the compliance report of the most-recently-seen device.
export async function GET() {
  const devices = listDevices().map(mapDevice);
  const latest = devices[0];
  return NextResponse.json({
    deviceId: latest?.deviceId ?? null,
    hostname: latest?.hostname ?? null,
    compliance: latest?.compliance ?? { score: 0, controls: [] },
  });
}
