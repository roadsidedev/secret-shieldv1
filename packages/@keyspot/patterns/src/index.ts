export interface Pattern {
  name: string;
  regex: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export { builtInPatterns } from './built-in.js';
export { AhoCorasick, AhoCorasickMatch } from './ahocorasick.js';
export { PatternRegistry, PatternRegistryOptions } from './registry.js';
export { CircuitBreaker, CircuitState, type CircuitBreakerOptions, type CircuitStats } from './circuit-breaker.js';
export { KeySpotError, VaultError, WorkerError, AuthError, PaymentRequiredError, ScanError, ConfigurationError, ValidationError, isKeySpotError, toStatusCode } from './errors.js';
