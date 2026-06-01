import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { ONLINE_WINDOW_MS, type Backend, type StoredDevice, type UserRow, type CommandRow, type OtpRecord } from './store-types';

const g = globalThis as unknown as { __intellifixDb?: DatabaseSync };

function db(): DatabaseSync {
  if (g.__intellifixDb) return g.__intellifixDb;
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  const d = new DatabaseSync(path.join(dir, 'intellifix.db'));
  d.exec(`
    CREATE TABLE IF NOT EXISTS devices (deviceId TEXT PRIMARY KEY, snapshot TEXT NOT NULL, updatedAt TEXT NOT NULL, registeredAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, deviceId TEXT NOT NULL, actionType TEXT NOT NULL, status TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, deviceId TEXT, actionType TEXT, success INTEGER, output TEXT, completedAt TEXT);
    CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS otp (username TEXT PRIMARY KEY, hash TEXT NOT NULL, exp INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS enrollments (hash TEXT PRIMARY KEY, exp INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS device_tokens (hash TEXT PRIMARY KEY, deviceId TEXT, createdAt TEXT);
  `);
  try { d.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"); } catch {}
  try { d.exec('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}
  g.__intellifixDb = d;
  return d;
}

export const sqliteBackend: Backend = {
  async upsertDevice(snapshot) {
    const now = new Date().toISOString();
    const deviceId = snapshot?.device?.deviceId;
    if (!deviceId) throw new Error('snapshot missing device.deviceId');
    const existing = db().prepare('SELECT registeredAt FROM devices WHERE deviceId = ?').get(deviceId);
    const registeredAt = existing?.registeredAt ?? now;
    db().prepare(
      `INSERT INTO devices (deviceId, snapshot, updatedAt, registeredAt) VALUES (?, ?, ?, ?)
       ON CONFLICT(deviceId) DO UPDATE SET snapshot = excluded.snapshot, updatedAt = excluded.updatedAt`,
    ).run(deviceId, JSON.stringify(snapshot), now, registeredAt);
  },

  async listDevices(): Promise<StoredDevice[]> {
    const rows = db().prepare('SELECT snapshot, updatedAt, registeredAt FROM devices ORDER BY updatedAt DESC').all();
    const nowMs = Date.now();
    return rows.map((r: any) => ({
      snapshot: JSON.parse(r.snapshot),
      updatedAt: r.updatedAt,
      registeredAt: r.registeredAt,
      isOnline: nowMs - new Date(r.updatedAt).getTime() < ONLINE_WINDOW_MS,
    }));
  },

  async enqueueCommand(deviceId, actionType) {
    const id = randomUUID();
    db().prepare('INSERT INTO commands (id, deviceId, actionType, status, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, deviceId, actionType, 'queued', new Date().toISOString());
    return id;
  },

  async takeQueuedCommands(deviceId): Promise<CommandRow[]> {
    const rows = db().prepare(
      "SELECT id, actionType, status, createdAt FROM commands WHERE deviceId = ? AND status = 'queued' ORDER BY createdAt ASC",
    ).all(deviceId);
    const mark = db().prepare("UPDATE commands SET status = 'running' WHERE id = ?");
    for (const r of rows) mark.run(r.id);
    return rows;
  },

  async recordResult(result) {
    const completedAt = result?.completedAt ?? new Date().toISOString();
    db().prepare('INSERT INTO history (id, deviceId, actionType, success, output, completedAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), result?.deviceId ?? null, result?.actionType ?? '', result?.success ? 1 : 0, result?.output ?? '', completedAt);
    if (result?.commandId) db().prepare('UPDATE commands SET status = ? WHERE id = ?').run(result.success ? 'completed' : 'failed', result.commandId);
  },

  async listHistory(limit) {
    return db().prepare('SELECT actionType, success, output, completedAt FROM history ORDER BY completedAt DESC LIMIT ?')
      .all(limit).map((r: any) => ({ actionType: r.actionType, status: r.success ? 'completed' : 'failed', output: r.output, completedAt: r.completedAt }));
  },

  async getUser(username): Promise<UserRow | undefined> {
    return db().prepare('SELECT username, email, salt, hash, createdAt, role FROM users WHERE username = ?').get(username);
  },

  async getUserByEmail(email): Promise<UserRow | undefined> {
    return db().prepare('SELECT username, email, salt, hash, createdAt, role FROM users WHERE lower(email) = lower(?)').get(email);
  },

  async createUser(u) {
    db().prepare('INSERT INTO users (username, email, salt, hash, createdAt, role) VALUES (?, ?, ?, ?, ?, ?)')
      .run(u.username, u.email ?? null, u.salt, u.hash, u.createdAt, u.role);
  },

  async updateUserPassword(username, salt, hash) {
    db().prepare('UPDATE users SET salt = ?, hash = ? WHERE username = ?').run(salt, hash, username);
  },

  async userCount() {
    return db().prepare('SELECT COUNT(*) AS n FROM users').get().n as number;
  },

  async setOtp(username, rec: OtpRecord) {
    db().prepare('INSERT INTO otp (username, hash, exp) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET hash = excluded.hash, exp = excluded.exp')
      .run(username, rec.hash, rec.exp);
  },

  async getOtp(username): Promise<OtpRecord | undefined> {
    const r = db().prepare('SELECT hash, exp FROM otp WHERE username = ?').get(username);
    return r ? { hash: r.hash, exp: r.exp } : undefined;
  },

  async clearOtp(username) {
    db().prepare('DELETE FROM otp WHERE username = ?').run(username);
  },

  async createEnrollment(hash, exp) {
    db().prepare('INSERT OR REPLACE INTO enrollments (hash, exp, used) VALUES (?, ?, 0)').run(hash, exp);
  },

  async consumeEnrollment(hash) {
    const r = db().prepare('SELECT exp, used FROM enrollments WHERE hash = ?').get(hash);
    if (!r || r.used || r.exp < Date.now()) return false;
    db().prepare('UPDATE enrollments SET used = 1 WHERE hash = ?').run(hash);
    return true;
  },

  async addDeviceToken(hash, deviceId) {
    db().prepare('INSERT OR REPLACE INTO device_tokens (hash, deviceId, createdAt) VALUES (?, ?, ?)')
      .run(hash, deviceId, new Date().toISOString());
  },

  async isDeviceToken(hash) {
    return !!db().prepare('SELECT 1 FROM device_tokens WHERE hash = ?').get(hash);
  },
};
