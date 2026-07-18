import { createHmac, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from 'crypto';

export interface VaultWriteOptions {
  visibleTo?: string[];
  ttl?: number;
  tags?: Record<string, string>;
  rotationHook?: (id: string, secret: string) => Promise<string>;
}

export interface VaultReference {
  id: string;
  hmac: string;
  expiry: number;
  version: 'v1';
}

export interface VaultAdapter {
  write(secret: string, options?: VaultWriteOptions): Promise<string>;
  read(id: string, agentId?: string): Promise<string | null>;
  list(): Promise<string[]>;
  delete(id: string): Promise<boolean>;
  generateRef(id: string, secret: string, ttl?: number): string;
  verifyRef(ref: string): boolean;
  toWorkerConfig(): VaultWorkerConfig;
  isInMemory?(): boolean;
}

export interface VaultWorkerConfig {
  type: string;
  options?: Record<string, unknown>;
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length === 0 || ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export abstract class BaseVaultAdapter implements VaultAdapter {
  protected secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || randomBytes(32).toString('hex');
  }

  abstract write(_secret: string, _options?: VaultWriteOptions): Promise<string>;
  abstract read(id: string, _agentId?: string): Promise<string | null>;
  abstract list(): Promise<string[]>;
  abstract delete(id: string): Promise<boolean>;

  toWorkerConfig(): VaultWorkerConfig {
    return { type: 'inmemory' };
  }

  isInMemory(): boolean {
    return false;
  }

  generateRef(id: string, _secret: string, ttl: number = 3600000): string {
    const expiry = Date.now() + ttl;
    const dataToSign = `${id}:${expiry}`;
    const hmac = createHmac('sha256', this.secretKey).update(dataToSign).digest('hex');
    return `vault:v1:${id}:${hmac}:${expiry}`;
  }

  verifyRef(ref: string): boolean {
    const parts = ref.split(':');
    if (parts.length !== 5 || parts[0] !== 'vault' || parts[1] !== 'v1') return false;
    const [, , id, hmac, expiryStr] = parts;
    if (!id || !hmac || !expiryStr) return false;
    const expiry = parseInt(expiryStr, 10);
    if (Number.isNaN(expiry) || expiry < Date.now()) return false;
    const dataToSign = `${id}:${expiry}`;
    const expectedHmac = createHmac('sha256', this.secretKey).update(dataToSign).digest('hex');
    return safeEqualHex(hmac, expectedHmac);
  }
}

export class InMemoryVaultAdapter extends BaseVaultAdapter {
  private store = new Map<string, { value: string; options?: VaultWriteOptions; createdAt: number }>();
  private encryptionKey: Buffer | null;

  constructor(secretKey?: string, encryptionKeyHex?: string) {
    super(secretKey);
    const envKey = encryptionKeyHex || process.env.KEYSPOT_VAULT_KEY;
    this.encryptionKey = envKey && /^[0-9a-fA-F]{64}$/.test(envKey)
      ? Buffer.from(envKey, 'hex')
      : null;
  }

  override isInMemory(): boolean {
    return true;
  }

  private seal(plaintext: string): string {
    if (!this.encryptionKey) return plaintext;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  private open(stored: string): string {
    if (!this.encryptionKey || !stored.startsWith('enc:v1:')) return stored;
    const parts = stored.split(':');
    if (parts.length !== 5) return stored;
    const iv = Buffer.from(parts[2]!, 'hex');
    const tag = Buffer.from(parts[3]!, 'hex');
    const data = Buffer.from(parts[4]!, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  async write(secret: string, options?: VaultWriteOptions): Promise<string> {
    const id = `vault_${randomBytes(8).toString('hex')}`;
    this.store.set(id, { value: this.seal(secret), options, createdAt: Date.now() });
    return id;
  }

  async read(id: string, agentId?: string): Promise<string | null> {
    const entry = this.store.get(id);
    if (!entry) return null;
    if (entry.options?.ttl && entry.createdAt + entry.options.ttl < Date.now()) {
      this.store.delete(id);
      return null;
    }
    if (entry.options?.visibleTo !== undefined) {
      if (!agentId || !entry.options.visibleTo.includes(agentId)) {
        return null;
      }
    }
    return this.open(entry.value);
  }

  async list(): Promise<string[]> {
    this.sweepExpired();
    return Array.from(this.store.keys());
  }

  sweepExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.store) {
      if (entry.options?.ttl && entry.createdAt + entry.options.ttl < now) {
        this.store.delete(id);
      }
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

export function sanitizeMatchPublic<T extends Record<string, unknown>>(match: T): Omit<T, 'rawValue'> {
  const { rawValue: _raw, ...rest } = match as T & { rawValue?: unknown };
  return rest;
}
