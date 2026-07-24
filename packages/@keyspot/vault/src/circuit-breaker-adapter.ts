import { CircuitBreaker, type CircuitBreakerOptions } from '@roadsidelab/keyspot-patterns/circuit-breaker';
import { VaultError } from '@roadsidelab/keyspot-patterns/errors';
import type { VaultAdapter, VaultWriteOptions } from './index.js';

export function withCircuitBreaker(
  adapter: VaultAdapter,
  breaker?: CircuitBreaker,
  options?: CircuitBreakerOptions,
): VaultAdapter {
  const cb = breaker ?? new CircuitBreaker(options);

  const guardedCall = async <T>(fn: () => Promise<T>, op: string): Promise<T> => {
    try {
      return await cb.call(fn);
    } catch (err) {
      if (err instanceof VaultError) throw err;
      throw new VaultError(
        `Vault ${op} failed: ${err instanceof Error ? err.message : String(err)}`,
        `VAULT_${op.toUpperCase()}_FAILED`,
        500,
        true,
        { operation: op, circuitState: cb.getState() },
      );
    }
  };

  return {
    write: (secret: string, options?: VaultWriteOptions) =>
      guardedCall(() => adapter.write(secret, options), 'write'),

    read: (id: string, agentId?: string) =>
      guardedCall(() => adapter.read(id, agentId), 'read'),

    list: () => guardedCall(() => adapter.list(), 'list'),

    delete: (id: string) =>
      guardedCall(() => adapter.delete(id), 'delete'),

    generateRef: (id: string, secret: string, ttl?: number) =>
      adapter.generateRef(id, secret, ttl),

    verifyRef: (ref: string) =>
      adapter.verifyRef(ref),

    toWorkerConfig: () =>
      adapter.toWorkerConfig(),

    isInMemory: () =>
      typeof adapter.isInMemory === 'function' ? adapter.isInMemory() : false,
  };
}
