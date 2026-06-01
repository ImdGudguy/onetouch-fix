import type { Backend } from './store-types';

export * from './store-types';

// Pick the backend once: Netlify Blobs in the cloud, SQLite locally.
const onNetlify = process.env.NETLIFY === 'true' || !!process.env.NETLIFY_BLOBS_CONTEXT;
let _backend: Backend | null = null;

async function backend(): Promise<Backend> {
  if (_backend) return _backend;
  _backend = onNetlify
    ? (await import('./blobs-store')).blobsBackend
    : (await import('./sqlite-store')).sqliteBackend;
  return _backend;
}

// Devices / telemetry
export const upsertDevice = async (s: any) => (await backend()).upsertDevice(s);
export const listDevices = async () => (await backend()).listDevices();

// Remediation queue + history
export const enqueueCommand = async (deviceId: string, actionType: string) => (await backend()).enqueueCommand(deviceId, actionType);
export const takeQueuedCommands = async (deviceId: string) => (await backend()).takeQueuedCommands(deviceId);
export const recordResult = async (r: any) => (await backend()).recordResult(r);
export const listHistory = async (limit = 20) => (await backend()).listHistory(limit);

// Users / auth
export const getUser = async (u: string) => (await backend()).getUser(u);
export const getUserByEmail = async (e: string) => (await backend()).getUserByEmail(e);
export const createUser = async (u: import('./store-types').UserRow) => (await backend()).createUser(u);
export const updateUserPassword = async (u: string, salt: string, hash: string) => (await backend()).updateUserPassword(u, salt, hash);
export const userCount = async () => (await backend()).userCount();

// OTP (password reset)
export const setOtp = async (u: string, rec: import('./store-types').OtpRecord) => (await backend()).setOtp(u, rec);
export const getOtp = async (u: string) => (await backend()).getOtp(u);
export const clearOtp = async (u: string) => (await backend()).clearOtp(u);

// Device enrollment
export const createEnrollment = async (hash: string, exp: number) => (await backend()).createEnrollment(hash, exp);
export const consumeEnrollment = async (hash: string) => (await backend()).consumeEnrollment(hash);
export const addDeviceToken = async (hash: string, deviceId: string) => (await backend()).addDeviceToken(hash, deviceId);
export const isDeviceToken = async (hash: string) => (await backend()).isDeviceToken(hash);
