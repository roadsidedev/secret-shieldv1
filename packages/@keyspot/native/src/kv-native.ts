/**
 * KeySpot native integration — wires Rust N-API core into the vault adapter
 * and KeySpot constructor for production-hardened deployments.
 *
 * When the native addon is loaded:
 *  - HMAC verify is constant-time via Rust
 *  - SecretBuffer zeroizes on drop
 *  - createSecure fails without native when NODE_ENV=production
 */

import { ConfigurationError } from '@roadsidelab/keyspot-core/errors';
import { hmacSign, hmacVerify, isNativeAvailable, getNativeLoadInfo } from './index.js';

export { hmacSign, hmacVerify, isNativeAvailable, getNativeLoadInfo, SecretBuffer } from './index.js';

/**
 * Error thrown when native bindings are required but absent.
 * Catches at KeySpot construction time rather than silently falling back.
 */
export class NativeRequiredError extends ConfigurationError {
  constructor() {
    super(
      'KeySpot production mode requires native bindings (@keyspot/native). ' +
      'Install the package and rebuild for your platform, or use dev mode. ' +
      'See docs/security/threat-model.md for details.',
      'NATIVE_REQUIRED',
    );
  }
}

/**
 * Assert that the native addon is available.
 * Call during createSecure or vault construction to enforce native requirement.
 */
export function requireNative(): void {
  if (!isNativeAvailable()) {
    throw new NativeRequiredError();
  }
}

/**
 * Check if native is required based on environment.
 * In production (NODE_ENV=production), native is required.
 * In development, native is optional (JS fallback used).
 */
export function isNativeRequiredInCurrentEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}
