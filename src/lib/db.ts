import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Single shared SQLite connection (memoised across Next.js hot reloads).
// ---------------------------------------------------------------------------
const g = globalThis as unknown as { __intellifixDb?: DatabaseSync };

function open(): DatabaseSync {
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, 'intellifix.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      deviceId    TEXT PRIMARY KEY,
      snapshot    TEXT NOT NULL,
      updatedAt   TEXT NOT NULL,
      registeredAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS commands (
      id        TEXT PRIMARY KEY,
      deviceId  TEXT NOT NULL,
      actionType TEXT NOT NULL,
      status    TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS history (
      id         TEXT PRIMARY KEY,
      deviceId   TEXT,
      actionType TEXT,
      success    INTEGER,
      output     TEXT,
      completedAt TEXT
    );
  `);
  return db;
}

export function db(): DatabaseSync {
  if (!g.__intellifixDb) g.__intellifixDb = open();
  return g.__intellifixDb;
}

const ONLINE_WINDOW_MS = 30_000;

// ---- devices --------------------------------------------------------------
export function upsertDevice(snapshot: any) {
  const now = new Date().toISOString();
  const deviceId = snapshot?.device?.deviceId;
  if (!deviceId) throw new Error('snapshot missing device.deviceId');

  const existing = db().prepare('SELECT registeredAt FROM devices WHERE deviceId = ?').get(deviceId);
  const registeredAt = existing?.registeredAt ?? now;

  db().prepare(
    `INSERT INTO devices (deviceId, snapshot, updatedAt, registeredAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(deviceId) DO UPDATE SET snapshot = excluded.snapshot, updatedAt = excluded.updatedAt`
  ).run(deviceId, JSON.stringify(snapshot), now, registeredAt);
}

export interface StoredDevice {
  snapshot: any;
  updatedAt: string;
  registeredAt: string;
  isOnline: boolean;
}

export function listDevices(): StoredDevice[] {
  const rows = db().prepare('SELECT snapshot, updatedAt, registeredAt FROM devices ORDER BY updatedAt DESC').all();
  const nowMs = Date.now();
  return rows.map((r: any) => ({
    snapshot: JSON.parse(r.snapshot),
    updatedAt: r.updatedAt,
    registeredAt: r.registeredAt,
    isOnline: nowMs - new Date(r.updatedAt).getTime() < ONLINE_WINDOW_MS,
  }));
}

// ---- commands -------------------------------------------------------------
export function enqueueCommand(deviceId: string, actionType: string): string {
  const id = randomUUID();
  db().prepare(
    'INSERT INTO commands (id, deviceId, actionType, status, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, deviceId, actionType, 'queued', new Date().toISOString());
  return id;
}

/** Return queued commands for a device and mark them as delivered (running). */
export function takeQueuedCommands(deviceId: string): { id: string; actionType: string; status: string; createdAt: string }[] {
  const rows = db().prepare(
    "SELECT id, actionType, status, createdAt FROM commands WHERE deviceId = ? AND status = 'queued' ORDER BY createdAt ASC"
  ).all(deviceId);
  const mark = db().prepare("UPDATE commands SET status = 'running' WHERE id = ?");
  for (const r of rows) mark.run(r.id);
  return rows;
}

// ---- history --------------------------------------------------------------
export function recordResult(result: any) {
  const completedAt = result?.completedAt ?? new Date().toISOString();
  db().prepare(
    'INSERT INTO history (id, deviceId, actionType, success, output, completedAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), result?.deviceId ?? null, result?.actionType ?? '', result?.success ? 1 : 0, result?.output ?? '', completedAt);

  if (result?.commandId) {
    db().prepare('UPDATE commands SET status = ? WHERE id = ?').run(result.success ? 'completed' : 'failed', result.commandId);
  }
}

export function listHistory(limit = 20) {
  return db().prepare(
    'SELECT id, deviceId, actionType, success, output, completedAt FROM history ORDER BY completedAt DESC LIMIT ?'
  ).all(limit).map((r: any) => ({
    actionType: r.actionType,
    status: r.success ? 'completed' : 'failed',
    output: r.output,
    completedAt: r.completedAt,
  }));
}
