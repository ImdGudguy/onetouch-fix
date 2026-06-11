/**
 * Stateless signed session token (HMAC-SHA256 over a small JSON payload).
 * Uses Web Crypto only, so it works both in Node route handlers and in the
 * Edge middleware. The cookie is the bearer; it is HTTP-only and signed, so it
 * can't be forged or read by client JS.
 *
 * Set SESSION_SECRET in the environment for production (see .env.example). The
 * dev fallback below is clearly marked and overridable — never ship it as-is.
 */
// In production a real secret is REQUIRED: shipping the dev default would make
// session cookies forgeable by anyone who knows it. Fail closed if it's missing
// in prod; allow a clearly-marked fallback only in dev.
const isProd = process.env.NODE_ENV === 'production';
const SECRET = process.env.SESSION_SECRET || (isProd ? '' : 'intellifix-dev-secret-change-me');
export const SESSION_COOKIE = 'intellifix_session';

const enc = new TextEncoder();

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlFromString(s: string): string {
  return b64urlFromBytes(enc.encode(s));
}
function bytesFromB64url(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function stringFromB64url(s: string): string {
  return new TextDecoder().decode(bytesFromB64url(s));
}

async function hmacKey(): Promise<CryptoKey> {
  if (!SECRET) {
    throw new Error(
      'SESSION_SECRET is not set. Set it in the environment (e.g. `openssl rand -hex 32`) before running in production.',
    );
  }
  return crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Create a signed token for `username`, valid for `days`. */
export async function createSessionToken(username: string, days = 7): Promise<string> {
  const payload = JSON.stringify({ u: username, exp: Date.now() + days * 86400_000 });
  const payloadB64 = b64urlFromString(payload);
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(payloadB64));
  return `${payloadB64}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

/** Verify a token; returns the username if valid and unexpired, else null. */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(), bytesFromB64url(sigB64), enc.encode(payloadB64));
    if (!ok) return null;
    const { u, exp } = JSON.parse(stringFromB64url(payloadB64));
    if (typeof exp !== 'number' || Date.now() > exp) return null;
    return typeof u === 'string' ? u : null;
  } catch {
    return null;
  }
}
