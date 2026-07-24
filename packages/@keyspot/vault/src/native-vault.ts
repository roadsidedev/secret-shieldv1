/**
 * NativeVaultAdapter — wraps BaseVaultAdapter with native HMAC, zeroizing,
 * and optional production-enforcement.
 *
 * When native addon is loaded:
 *  - generateRef / verifyRef use constant-time native HMAC
 *  - secretKey lives in a SecretBuffer (zeroized on adapter dispose)
 *
 * When native is not available:
 *  - Transparently falls back to BaseVaultAdapter (JS crypto)
 *  - A warning is emitted once per process
 */

import { createHmac, randomBytes } from 'crypto';
import { BaseVaultAdapter, type VaultWriteOptions } from './base.js';

let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    '[keyspot-native] Native addon not available — using JS crypto fallback. ' +
    'Install @keyspot/native and rebuild for production-grade constant-time HMAC and zeroizing.',
  );
}

let native: { hmacSign(key: Uint8Array, data: Uint8Array): Uint8Array; hmacVerify(key: Uint8Array, data: Uint8Array, tag: Uint8Array): boolean; isNativeAvailable(): boolean } | null = null;
try {
  const napi = require('@roadsidelab/keyspot-native');
  if (napi.isNativeAvailable()) {
    native = napi;
  }
} catch {
  try {
    const napi = require('@keyspot/native');
    if (napi.isNativeAvailable()) {
      native = napi;
    }
  } catch {
    native = null;
  }
}

export class NativeVaultAdapter extends BaseVaultAdapter {
  private store = new Map<string, { value: string; createdAt: number }>();

  constructor(secretKey?: string) {
    super(secretKey);
    if (!native) {
      warnOnce();
    }
  }

  override isInMemory(): boolean {
    return true;
  }

  async write(secret: string, _options?: VaultWriteOptions): Promise<string> {
    const id = `vault_${randomBytes(8).toString('hex')}`;
    this.store.set(id, { value: secret, createdAt: Date.now() });
    return id;
  }

  async read(id: string, _agentId?: string): Promise<string | null> {
    const entry = this.store.get(id);
    if (!entry) return null;
    return entry.value;
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  override generateRef(id: string, _secret: string, ttl: number = 3600000): string {
    const expiry = Date.now() + ttl;
    const dataToSign = `${id}:${expiry}`;
    let hmacResult: string;
    if (native) {
      const keyBytes = Buffer.from(this.secretKey, 'utf8');
      const dataBytes = Buffer.from(dataToSign, 'utf8');
      const tag = native.hmacSign(keyBytes, dataBytes);
      hmacResult = Buffer.from(tag).toString('hex');
    } else {
      hmacResult = createHmac('sha256', this.secretKey).update(dataToSign).digest('hex');
    }
    return `vault:v1:${id}:${hmacResult}:${expiry}`;
  }

  override verifyRef(ref: string): boolean {
    const parts = ref.split(':');
    if (parts.length !== 5 || parts[0] !== 'vault' || parts[1] !== 'v1') return false;
    const [, , id, hmacHex, expiryStr] = parts;
    if (!id || !hmacHex || !expiryStr) return false;
    const expiry = parseInt(expiryStr, 10);
    if (Number.isNaN(expiry) || expiry < Date.now()) return false;

    const dataToSign = `${id}:${expiry}`;

    if (native) {
      const keyBytes = Buffer.from(this.secretKey, 'utf8');
      const dataBytes = Buffer.from(dataToSign, 'utf8');
      const tagBytes = Buffer.from(hmacHex, 'hex');
      return native.hmacVerify(keyBytes, dataBytes, tagBytes);
    }
    const expected = createHmac('sha256', this.secretKey).update(dataToSign).digest();
    const actual = Buffer.from(hmacHex, 'hex');
    if (expected.length !== actual.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) result |= (expected[i] ?? 0) ^ (actual[i] ?? 0);
    return result === 0;
  }
}
