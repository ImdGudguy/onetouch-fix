import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The pre-built agent bundle is published to GitHub Releases by CI. Redirect
// there so the download works in any deploy (Netlify, Docker, etc.).
const RELEASE_ZIP = 'https://github.com/ImdGudguy/onetouch-fix/releases/latest/download/IntelliFix-Agent.zip';

export async function GET() {
  return NextResponse.redirect(RELEASE_ZIP, 302);
}
