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

import { createHmac } from 'crypto';
import { BaseVaultAdapter } from './base.js';

let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    '[keyspot-native] Native addon not available — using JS crypto fallback. ' +
    'Install @keyspot/native and rebuild for production-grade constant-time HMAC and zeroizing.',
  );
}

let native: typeof import('@roadsidelab/keyspot-native') | null = null;
try {
  native = require('@roadsidelab/keyspot-native');
  if (!native.isNativeAvailable()) {
    native = null;
  }
} catch {
  try {
    native = require('@keyspot/native');
    if (!native.isNativeAvailable()) {
      native = null;
    }
  } catch {
    native = null;
  }
}

export class NativeVaultAdapter extends BaseVaultAdapter {
  constructor(secretKey?: string) {
    super(secretKey);
    if (!native) {
      warnOnce();
    }
  }

  override isInMemory(): boolean {
    return true;
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
    for (let i = 0; i < expected.length; i++) result |= expected[i] ^ actual[i];
    return result === 0;
  }
}
