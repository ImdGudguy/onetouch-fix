import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { isDeviceToken, deviceIdForToken } from '@/lib/store';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const isProd = process.env.NODE_ENV === 'production';

/**
 * Authenticates the agent channel (/api/agent/telemetry|commands|result).
 * Accepts either a valid per-device token (issued via enrollment) or the legacy
 * shared INTELLIFIX_AGENT_TOKEN.
 *
 * In development, if nothing is configured the channel is left open for
 * convenience. In PRODUCTION the channel is never open: a valid device token
 * (or the shared token) is always required, so an unconfigured deployment can't
 * accidentally expose the ingest endpoints.
 */
export async function agentUnauthorized(req: Request): Promise<NextResponse | null> {
  const provided = req.headers.get('x-intellifix-token') || '';

  // 1) A valid per-device token.
  if (provided && (await isDeviceToken(sha256(provided)))) return null;

  // 2) Legacy/shared token.
  const shared = process.env.INTELLIFIX_AGENT_TOKEN;
  if (shared && provided && timingSafeEqual(provided, shared)) return null;

  // 3) Dev-only convenience: open channel when nothing is configured. Never prod.
  if (!shared && !isProd) return null;

  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

/**
 * Returns the deviceId a per-device token is bound to, or null when the caller
 * used the shared token / dev-open channel (no per-device binding). Routes use
 * this to enforce that a device can only act on its own deviceId.
 */
export async function agentDeviceId(req: Request): Promise<string | null> {
  const provided = req.headers.get('x-intellifix-token') || '';
  if (!provided) return null;
  return deviceIdForToken(sha256(provided));
}

/**
 * 403 if a per-device token is being used for a different device than `target`.
 * No-op (returns null) for the shared token / dev-open channel.
 */
export async function agentDeviceMismatch(req: Request, target: string | undefined | null): Promise<NextResponse | null> {
  const bound = await agentDeviceId(req);
  if (bound && target && bound !== target) {
    return NextResponse.json({ error: 'device token does not match target device' }, { status: 403 });
  }
  return null;
}
