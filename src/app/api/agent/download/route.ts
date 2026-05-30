import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serves the packaged agent bundle (Service exe + consent Tray exe + install
// scripts) produced by agent/build-agent.ps1. Wired to the "Download Agent"
// button under Settings → Agent Deployment.
export async function GET() {
  const zipPath = path.join(process.cwd(), 'agent', 'dist', 'IntelliFix-Agent.zip');
  if (!fs.existsSync(zipPath)) {
    return NextResponse.json(
      { error: 'Agent package not built yet. Run agent\\build-agent.ps1 to produce the installer bundle.' },
      { status: 404 },
    );
  }
  const stat = fs.statSync(zipPath);
  const webStream = Readable.toWeb(fs.createReadStream(zipPath)) as ReadableStream;
  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="IntelliFix-Agent.zip"',
      'Content-Length': String(stat.size),
    },
  });
}
