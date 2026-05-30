import { NextResponse } from 'next/server';
import { listHistory } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ history: listHistory(20) });
}
