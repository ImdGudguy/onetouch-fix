export const ONLINE_WINDOW_MS = 30_000;

export interface StoredDevice {
  snapshot: any;
  updatedAt: string;
  registeredAt: string;
  isOnline: boolean;
}

export interface UserRow {
  username: string;
  email?: string;
  salt: string;
  hash: string;
  role: string;
  createdAt: string;
}

export interface CommandRow {
  id: string;
  actionType: string;
  status: string;
  createdAt: string;
}

export interface OtpRecord {
  hash: string;
  exp: number;
}

/** Storage backend contract — implemented by SQLite (local) and Netlify Blobs (cloud). */
export interface Backend {
  upsertDevice(snapshot: any): Promise<void>;
  listDevices(): Promise<StoredDevice[]>;
  enqueueCommand(deviceId: string, actionType: string): Promise<string>;
  takeQueuedCommands(deviceId: string): Promise<CommandRow[]>;
  recordResult(result: any): Promise<void>;
  listHistory(limit: number): Promise<any[]>;

  getUser(username: string): Promise<UserRow | undefined>;
  getUserByEmail(email: string): Promise<UserRow | undefined>;
  createUser(user: UserRow): Promise<void>;
  updateUserPassword(username: string, salt: string, hash: string): Promise<void>;
  userCount(): Promise<number>;

  setOtp(username: string, rec: OtpRecord): Promise<void>;
  getOtp(username: string): Promise<OtpRecord | undefined>;
  clearOtp(username: string): Promise<void>;
}
