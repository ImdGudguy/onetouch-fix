/**
 * In-memory login lockout (brute-force protection). Keyed by IP+username.
 * After MAX failures inside WINDOW, the key is locked for LOCK ms.
 * Memoised on globalThis so it survives Next.js hot reloads (single-instance).
 * For multi-instance deployments, back this with Redis.
 */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const LOCK_MS = 15 * 60_000;

interface Entry { fails: number; first: number; lockUntil: number; }

const g = globalThis as unknown as { __ilxLogin?: Map<string, Entry> };
const store: Map<string, Entry> = (g.__ilxLogin ??= new Map());

/** Seconds remaining on a lock, or 0 if not locked. */
export function lockRemainingSeconds(key: string): number {
  const e = store.get(key);
  if (e && e.lockUntil > Date.now()) return Math.ceil((e.lockUntil - Date.now()) / 1000);
  return 0;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  let e = store.get(key);
  if (!e || now - e.first > WINDOW_MS) e = { fails: 0, first: now, lockUntil: 0 };
  e.fails += 1;
  if (e.fails >= MAX_FAILURES) e.lockUntil = now + LOCK_MS;
  store.set(key, e);
}

export function resetFailures(key: string): void {
  store.delete(key);
}

export function clientKey(req: Request, username: string): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  return `${ip}|${username.trim().toLowerCase()}`;
}
