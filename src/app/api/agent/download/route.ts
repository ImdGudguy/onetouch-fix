import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The GUI installer is published to GitHub Releases by CI. Redirect there so the
// download works in any deploy (Netlify, Docker, etc.).
const RELEASE_SETUP = 'https://github.com/ImdGudguy/onetouch-fix/releases/latest/download/IntelliFix-Agent-Setup.exe';

export async function GET() {
  return NextResponse.redirect(RELEASE_SETUP, 302);
}
