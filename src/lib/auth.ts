import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { isDeviceToken } from '@/lib/store';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Authenticates the agent channel (/api/agent/telemetry|commands|result).
 * Accepts either a valid per-device token (issued via enrollment) or the legacy
 * shared INTELLIFIX_AGENT_TOKEN. If no shared token is configured (local dev),
 * the channel is open for convenience.
 */
export async function agentUnauthorized(req: Request): Promise<NextResponse | null> {
  const provided = req.headers.get('x-intellifix-token') || '';

  // 1) A valid per-device token.
  if (provided && (await isDeviceToken(sha256(provided)))) return null;

  // 2) Legacy/shared token.
  const shared = process.env.INTELLIFIX_AGENT_TOKEN;
  if (shared && provided && timingSafeEqual(provided, shared)) return null;

  // 3) Dev convenience: nothing configured → open channel.
  if (!shared) return null;

  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
