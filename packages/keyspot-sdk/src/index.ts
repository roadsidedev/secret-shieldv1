export {
  KeySpot,
  KeySpotConfig,
  SecureConfig,
  CheckpointTrigger,
  PrunerStrategy,
} from '@roadsidelab/keyspot-core';

export {
  Scanner,
  ScannerOptions,
  Match,
} from '@roadsidelab/keyspot-core/scanner';

export {
  TaintEngine,
} from '@roadsidelab/keyspot-core/taint';

export {
  PromptShield,
  PromptShieldRule,
  AuditLogger,
  AuditEntry,
} from '@roadsidelab/keyspot-core/security';

export {
  WorkerPool,
} from '@roadsidelab/keyspot-core/worker';

export {
  PersistedAuditLogger,
  SigningKeyPair,
  generateSigningKeyPair,
  signEntry,
  verifyEntrySignature,
} from '@roadsidelab/keyspot-core/compliance';

export {
  VectorStoreAdapter,
  BaseVectorStoreAdapter,
} from '@roadsidelab/keyspot-core/adapters';

export {
  ConsoleTracer,
  OtelTracer,
  KeySpotTracer,
  Tracer,
  noopTracer,
  setGlobalTracer,
  getGlobalTracer,
} from '@roadsidelab/keyspot-core/telemetry';

export {
   VaultAdapter,
   VaultWriteOptions,
   VaultReference,
   BaseVaultAdapter,
   InMemoryVaultAdapter,
   NativeVaultAdapter,
   withCircuitBreaker as vaultWithCircuitBreaker,
 } from '@roadsidelab/keyspot-vault';

export {
  KeySpotError,
  VaultError,
  WorkerError,
  AuthError,
  PaymentRequiredError,
  ConfigurationError,
  ValidationError,
  ScanError,
  isKeySpotError,
  toStatusCode,
} from '@roadsidelab/keyspot-core/errors';

export {
  CircuitBreaker,
  CircuitState,
} from '@roadsidelab/keyspot-core/circuit-breaker';

export {
  Pattern,
  builtInPatterns,
  AhoCorasick,
  AhoCorasickMatch,
  PatternRegistry,
  PatternRegistryOptions,
} from '@roadsidelab/keyspot-patterns';
