export { withCircuitBreaker } from './circuit-breaker-adapter.js';
export { NativeVaultAdapter } from './native-vault.js';
export {
  VaultAdapter,
  VaultAdapter as KeySpotVault,
  VaultWriteOptions,
  VaultReference,
  BaseVaultAdapter,
  InMemoryVaultAdapter,
  VaultWorkerConfig,
  sanitizeMatchPublic,
} from './base.js';
