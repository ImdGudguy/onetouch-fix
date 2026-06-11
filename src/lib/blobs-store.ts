import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { ONLINE_WINDOW_MS, type Backend, type StoredDevice, type UserRow, type CommandRow, type OtpRecord } from './store-types';

// Each logical table is a Blobs store. Strong consistency keeps the command
// queue correct (read-after-write) at the cost of a little latency.
const devices = () => getStore({ name: 'intellifix-devices', consistency: 'strong' });
const commands = () => getStore({ name: 'intellifix-commands', consistency: 'strong' });
const history = () => getStore({ name: 'intellifix-history', consistency: 'strong' });
const users = () => getStore({ name: 'intellifix-users', consistency: 'strong' });
const otps = () => getStore({ name: 'intellifix-otp', consistency: 'strong' });
const enrollments = () => getStore({ name: 'intellifix-enrollments', consistency: 'strong' });
const deviceTokens = () => getStore({ name: 'intellifix-devicetokens', consistency: 'strong' });

const uk = (username: string) => `u_${encodeURIComponent(username.toLowerCase())}`;

async function getAll<T>(store: ReturnType<typeof getStore>): Promise<{ key: string; value: T }[]> {
  const { blobs } = await store.list();
  const out: { key: string; value: T }[] = [];
  for (const b of blobs) {
    const value = (await store.get(b.key, { type: 'json' })) as T | null;
    if (value != null) out.push({ key: b.key, value });
  }
  return out;
}

export const blobsBackend: Backend = {
  async upsertDevice(snapshot) {
    const now = new Date().toISOString();
    const deviceId = snapshot?.device?.deviceId;
    if (!deviceId) throw new Error('snapshot missing device.deviceId');
    const store = devices();
    const existing = (await store.get(deviceId, { type: 'json' })) as any;
    const registeredAt = existing?.registeredAt ?? now;
    await store.setJSON(deviceId, { snapshot, updatedAt: now, registeredAt });
  },

  async listDevices(): Promise<StoredDevice[]> {
    const rows = await getAll<any>(devices());
    const nowMs = Date.now();
    return rows
      .map((r) => ({
        snapshot: r.value.snapshot,
        updatedAt: r.value.updatedAt,
        registeredAt: r.value.registeredAt,
        isOnline: nowMs - new Date(r.value.updatedAt).getTime() < ONLINE_WINDOW_MS,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async enqueueCommand(deviceId, actionType) {
    const id = randomUUID();
    await commands().setJSON(id, { id, deviceId, actionType, status: 'queued', createdAt: new Date().toISOString() });
    return id;
  },

  async takeQueuedCommands(deviceId): Promise<CommandRow[]> {
    const store = commands();
    const rows = await getAll<any>(store);
    const queued = rows
      .filter((r) => r.value.deviceId === deviceId && r.value.status === 'queued')
      .sort((a, b) => a.value.createdAt.localeCompare(b.value.createdAt));
    for (const r of queued) await store.setJSON(r.key, { ...r.value, status: 'running' });
    return queued.map((r) => ({ id: r.value.id, actionType: r.value.actionType, status: 'queued', createdAt: r.value.createdAt }));
  },

  async recordResult(result) {
    const completedAt = result?.completedAt ?? new Date().toISOString();
    await history().setJSON(`${completedAt}_${randomUUID()}`, {
      actionType: result?.actionType ?? '', success: !!result?.success, output: result?.output ?? '', completedAt,
    });
    if (result?.commandId) {
      const store = commands();
      const cmd = (await store.get(result.commandId, { type: 'json' })) as any;
      if (cmd) await store.setJSON(result.commandId, { ...cmd, status: result.success ? 'completed' : 'failed', output: result?.output ?? '' });
    }
  },

  async getCommandStatus(id) {
    const cmd = (await commands().get(id, { type: 'json' })) as any;
    return cmd ? { status: cmd.status, actionType: cmd.actionType, output: cmd.output ?? '' } : null;
  },

  async listHistory(limit) {
    const rows = await getAll<any>(history());
    return rows
      .map((r) => ({ actionType: r.value.actionType, status: r.value.success ? 'completed' : 'failed', output: r.value.output, completedAt: r.value.completedAt }))
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
      .slice(0, limit);
  },

  async getUser(username): Promise<UserRow | undefined> {
    return ((await users().get(uk(username), { type: 'json' })) as UserRow) ?? undefined;
  },

  async getUserByEmail(email): Promise<UserRow | undefined> {
    const rows = await getAll<UserRow>(users());
    return rows.find((r) => (r.value.email ?? '').toLowerCase() === email.toLowerCase())?.value;
  },

  async createUser(u) {
    await users().setJSON(uk(u.username), u);
  },

  async updateUserPassword(username, salt, hash) {
    const store = users();
    const u = (await store.get(uk(username), { type: 'json' })) as UserRow | null;
    if (u) await store.setJSON(uk(username), { ...u, salt, hash });
  },

  async userCount() {
    const { blobs } = await users().list();
    return blobs.length;
  },

  async setOtp(username, rec: OtpRecord) {
    await otps().setJSON(uk(username), rec);
  },

  async getOtp(username): Promise<OtpRecord | undefined> {
    return ((await otps().get(uk(username), { type: 'json' })) as OtpRecord) ?? undefined;
  },

  async clearOtp(username) {
    await otps().delete(uk(username));
  },

  async createEnrollment(hash, exp) {
    await enrollments().setJSON(hash, { exp, used: false });
  },

  async consumeEnrollment(hash) {
    const store = enrollments();
    const r = (await store.get(hash, { type: 'json' })) as { exp: number; used: boolean } | null;
    if (!r || r.used || r.exp < Date.now()) return false;
    await store.setJSON(hash, { ...r, used: true });
    return true;
  },

  async addDeviceToken(hash, deviceId) {
    await deviceTokens().setJSON(hash, { deviceId, createdAt: new Date().toISOString() });
  },

  async isDeviceToken(hash) {
    return (await deviceTokens().get(hash, { type: 'json' })) != null;
  },

  async deviceIdForToken(hash) {
    const r = (await deviceTokens().get(hash, { type: 'json' })) as { deviceId?: string } | null;
    return r?.deviceId ?? null;
  },
};
