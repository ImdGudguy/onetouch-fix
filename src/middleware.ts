import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

// Runs on every request except Next internals/assets.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

function isAgentChannel(pathname: string): boolean {
  // The agent authenticates with its own token (see lib/auth.ts), not a user
  // session — telemetry/result/commands must stay open to it. The browser-facing
  // download endpoint is NOT exempt (operators must be logged in to download).
  if (!pathname.startsWith('/api/agent/')) return false;
  if (pathname === '/api/agent/download') return false;
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public: login page, auth endpoints, and the agent ingest channel.
  if (pathname === '/login' || pathname.startsWith('/api/auth/') || isAgentChannel(pathname)) {
    return NextResponse.next();
  }

  const username = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (username) return NextResponse.next();

  // Unauthenticated.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}
