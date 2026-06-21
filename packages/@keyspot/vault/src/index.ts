import { createHmac, randomBytes } from 'crypto';

export { withCircuitBreaker } from './circuit-breaker-adapter.js';

export interface VaultWriteOptions {
  visibleTo?: string[]; // ACLs: list of agent IDs or wallet addresses
  ttl?: number; // Time to live in milliseconds
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

  generateRef(id: string, _secret: string, ttl: number = 3600000): string {
    const expiry = Date.now() + ttl;
    const dataToSign = `${id}:${expiry}`;
    const hmac = createHmac('sha256', this.secretKey).update(dataToSign).digest('hex');
    return `vault:v1:${id}:${hmac}:${expiry}`;
  }

  verifyRef(ref: string): boolean {
    const parts = ref.split(':');
    if (parts.length !== 5 || parts[0] !== 'vault' || parts[1] !== 'v1') return false;
    
    const [,, id, hmac, expiryStr] = parts;
    if (!id || !hmac || !expiryStr) return false;
    const expiry = parseInt(expiryStr, 10);
    
    if (expiry < Date.now()) return false;
    
    const dataToSign = `${id}:${expiry}`;
    const expectedHmac = createHmac('sha256', this.secretKey).update(dataToSign).digest('hex');
    
    return hmac === expectedHmac;
  }
}

export class InMemoryVaultAdapter extends BaseVaultAdapter {
  private store = new Map<string, { value: string; options?: VaultWriteOptions; createdAt: number }>();

  async write(secret: string, options?: VaultWriteOptions): Promise<string> {
    const id = `vault_${randomBytes(8).toString('hex')}`;
    this.store.set(id, { value: secret, options, createdAt: Date.now() });
    return id;
  }

  async read(id: string, agentId?: string): Promise<string | null> {
    const entry = this.store.get(id);
    if (!entry) return null;
    
    // Check TTL (ttl is relative milliseconds from creation)
    if (entry.options?.ttl && entry.createdAt + entry.options.ttl < Date.now()) {
      this.store.delete(id);
      return null;
    }

    // Check ACLs
    if (entry.options?.visibleTo && agentId && !entry.options.visibleTo.includes(agentId)) {
      return null;
    }
    
    return entry.value;
  }

  async list(): Promise<string[]> {
    this.sweepExpired();
    return Array.from(this.store.keys());
  }

  /** Remove all expired entries from the store. Public so callers can
   *  optionally schedule periodic cleanup (e.g., setInterval). */
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
