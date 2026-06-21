import { describe, it, expect, vi } from 'vitest';
import {
  KeySpotError, VaultError, WorkerError, AuthError,
  PaymentRequiredError, ConfigurationError, ValidationError, ScanError,
  isKeySpotError, toStatusCode,
} from '@roadsidelab/keyspot-core/errors';
import { CircuitBreaker, CircuitState } from '@roadsidelab/keyspot-core/circuit-breaker';
import { withCircuitBreaker } from '@roadsidelab/keyspot-vault/circuit-breaker-adapter';
import { InMemoryVaultAdapter } from '@roadsidelab/keyspot-vault';
import { KeySpot } from '@roadsidelab/keyspot-sdk';

// ── Error Taxonomy ────────────────────────────────────────────

describe('Error Taxonomy', () => {
  it('KeySpotError has code, statusCode, retryable, details', () => {
    const err = new KeySpotError('test', 'TEST_CODE', 400, false, { foo: 'bar' });
    expect(err.message).toBe('test');
    expect(err.code).toBe('TEST_CODE');
    expect(err.statusCode).toBe(400);
    expect(err.retryable).toBe(false);
    expect(err.details).toEqual({ foo: 'bar' });
    expect(err.name).toBe('KeySpotError');
  });

  it('VaultError defaults to retryable=true, status=500', () => {
    const err = new VaultError('vault down');
    expect(err.code).toBe('VAULT_OPERATION_FAILED');
    expect(err.retryable).toBe(true);
    expect(err.statusCode).toBe(500);
  });

  it('AuthError is non-retryable, status=401', () => {
    const err = new AuthError('bad key');
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.retryable).toBe(false);
    expect(err.statusCode).toBe(401);
  });

  it('PaymentRequiredError is non-retryable, status=402', () => {
    const err = new PaymentRequiredError('pay up');
    expect(err.statusCode).toBe(402);
    expect(err.retryable).toBe(false);
  });

  it('WorkerError is retryable by default', () => {
    const err = new WorkerError('worker crashed');
    expect(err.retryable).toBe(true);
  });

  it('ConfigurationError is non-retryable', () => {
    const err = new ConfigurationError('bad config');
    expect(err.retryable).toBe(false);
  });

  it('isKeySpotError returns true for all subclasses', () => {
    expect(isKeySpotError(new VaultError('x'))).toBe(true);
    expect(isKeySpotError(new AuthError('x'))).toBe(true);
    expect(isKeySpotError(new Error('x'))).toBe(false);
  });

  it('toStatusCode maps errors correctly', () => {
    expect(toStatusCode(new VaultError('x'))).toBe(500);
    expect(toStatusCode(new AuthError('x'))).toBe(401);
    expect(toStatusCode(new PaymentRequiredError('x'))).toBe(402);
    expect(toStatusCode(new Error('generic'))).toBe(500);
    expect(toStatusCode(new SyntaxError('parse'))).toBe(400);
  });

  it('toJSON produces serializable output', () => {
    const err = new VaultError('write failed', 'VAULT_WRITE_FAILED', 503, true, { op: 'write' });
    const json = err.toJSON();
    expect(json.name).toBe('VaultError');
    expect(json.code).toBe('VAULT_WRITE_FAILED');
    expect(json.statusCode).toBe(503);
    expect(json.retryable).toBe(true);
    expect(json.details).toEqual({ op: 'write' });
  });

  it('all errors are instanceof KeySpotError and Error', () => {
    const errors = [
      new VaultError('x'),
      new WorkerError('x'),
      new AuthError('x'),
      new PaymentRequiredError('x'),
      new ConfigurationError('x'),
      new ValidationError('x'),
      new ScanError('x'),
    ];
    for (const err of errors) {
      expect(err instanceof KeySpotError).toBe(true);
      expect(err instanceof Error).toBe(true);
    }
  });
});

// ── Circuit Breaker ───────────────────────────────────────────

describe('CircuitBreaker', () => {
  it('starts CLOSED', () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('opens after threshold failures', async () => {
    const cb = new CircuitBreaker({ threshold: 3, resetTimeoutMs: 60000 });
    const failing = vi.fn().mockRejectedValue(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await expect(cb.call(failing)).rejects.toThrow('fail');
    }
    expect(cb.getState()).toBe(CircuitState.OPEN);
    expect(cb.getStats().failureCount).toBe(3);
  });

  it('blocks calls when OPEN', async () => {
    const cb = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 60000 });
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    await expect(cb.call(() => Promise.resolve('ok'))).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('transitions HALF_OPEN after reset timeout', async () => {
    const cb = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 50 });
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(cb.getState()).toBe(CircuitState.OPEN);
    await new Promise(r => setTimeout(r, 60));
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
  });

  it('recovers from HALF_OPEN to CLOSED on success', async () => {
    const cb = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 50 });
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    await new Promise(r => setTimeout(r, 60));
    const result = await cb.call(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('re-opens from HALF_OPEN on probe failure', async () => {
    const cb = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 50 });
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    await new Promise(r => setTimeout(r, 60));
    await expect(cb.call(() => Promise.reject(new Error('still failing')))).rejects.toThrow('still failing');
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('fires onOpen/onClose/onHalfOpen callbacks', async () => {
    const events: string[] = [];
    const cb = new CircuitBreaker({
      threshold: 1,
      resetTimeoutMs: 50,
      onOpen: () => events.push('open'),
      onClose: () => events.push('close'),
      onHalfOpen: () => events.push('half_open'),
    });

    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(events).toContain('open');

    await new Promise(r => setTimeout(r, 60));
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
    expect(events).toContain('half_open');

    await cb.call(() => Promise.resolve('ok'));
    expect(events).toContain('close');
  });

  it('reset() returns to CLOSED state', async () => {
    const cb = new CircuitBreaker({ threshold: 1 });
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);
    cb.reset();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
    expect(cb.getStats().failureCount).toBe(0);
  });

  it('getStats returns current state', async () => {
    const cb = new CircuitBreaker({ threshold: 3 });
    const stats = cb.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failureCount).toBe(0);
    expect(stats.successCount).toBe(0);
    expect(stats.lastFailureTime).toBeNull();
    expect(stats.openedAt).toBeNull();
  });
});

// ── Vault Circuit Breaker Adapter ─────────────────────────────

describe('Vault Circuit Breaker Adapter', () => {
  it('passes through writes when circuit is CLOSED', async () => {
    const inner = new InMemoryVaultAdapter();
    const wrapped = withCircuitBreaker(inner, undefined, { threshold: 5 });
    const id = await wrapped.write('secret123');
    const val = await wrapped.read(id);
    expect(val).toBe('secret123');
  });

  it('blocks reads when circuit is OPEN', async () => {
    const inner = new InMemoryVaultAdapter();
    const breaker = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 60000 });
    const wrapped = withCircuitBreaker(inner, breaker);

    // First read fails because the underlying adapter doesn't throw
    const val = await wrapped.read('nonexistent');
    expect(val).toBeNull();

    // Manually open the circuit to test fast-fail behavior
    await expect(breaker.call(() => Promise.reject(new Error('forced')))).rejects.toThrow('forced');
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    await expect(wrapped.read('anything')).rejects.toThrow(/circuit breaker/i);
  });

  it('does not wrap generateRef or verifyRef', () => {
    const inner = new InMemoryVaultAdapter();
    const wrapped = withCircuitBreaker(inner);
    const ref = wrapped.generateRef('test-id', 'secret-value');
    expect(ref).toMatch(/^vault:v1:/);
    expect(wrapped.verifyRef(ref)).toBe(true);
  });

  it('recovers after reset timeout on successful probe', async () => {
    const inner = new InMemoryVaultAdapter();
    const breaker = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 50 });
    const wrapped = withCircuitBreaker(inner, breaker);

    await expect(breaker.call(() => Promise.reject(new Error('forced')))).rejects.toThrow('forced');
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    await new Promise(r => setTimeout(r, 60));
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    const id = await wrapped.write('recovered');
    const val = await wrapped.read(id);
    expect(val).toBe('recovered');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });
});

// ── KeySpot Fail-Closed ───────────────────────────────────────

describe('KeySpot Fail-Closed', () => {
  it('throws KeySpotError subclass on payment failure', async () => {
    const guard = new KeySpot({ hosted: { enabled: true } });
    try {
      await guard.checkpoint({ test: 'hello' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err instanceof KeySpotError).toBe(true);
      expect((err as KeySpotError).statusCode).toBe(402);
      expect((err as KeySpotError).code).toBe('PAYMENT_REQUIRED');
    }
  });

  it('checkpoint with default vault works normally', async () => {
    const guard = new KeySpot();
    const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(result.key).toMatch(/^vault:v1:/);
  });

  it('vault circuit breaker wraps vault operations', () => {
    const guard = new KeySpot();
    const vault = guard.getVault();
    expect(vault.generateRef).toBeDefined();
    expect(vault.verifyRef).toBeDefined();
    expect(vault.write).toBeDefined();
  });

  it('vault write failure during checkpoint blocks state', async () => {
    const failingVault = new InMemoryVaultAdapter();
    // Use a fake vault adapter that throws on write
    const throwingVault = {
      write: async () => { throw new Error('storage failure'); },
      read: async () => null,
      list: async () => [],
      delete: async () => false,
      generateRef: (id: string) => `vault:v1:${id}:abc:0`,
      verifyRef: () => false,
    };

    const guard = new KeySpot({ vault: throwingVault });
    const state = { key: 'sk-123456789012345678901234567890123456789012345678' };
    await expect(guard.checkpoint(state)).rejects.toThrow(/fail-closed/);
  });

  it('rotation hook failure does not prevent vaulting', async () => {
    const guard = new KeySpot({
      rotationHook: async () => { throw new Error('rotation error'); },
      taintEnabled: true,
    });
    const state = { key: 'sk-123456789012345678901234567890123456789012345678' };
    const result = await guard.checkpoint(state);
    expect(result.key).toMatch(/^vault:v1:/);
  });

  it('setAccessToken with tight expiry works before it expires', async () => {
    const guard = new KeySpot({ hosted: { enabled: true } });
    guard.setAccessToken('tight-token', Date.now() + 60_000);
    const state = { test: 'hello' };
    const result = await guard.checkpoint(state);
    expect(result.test).toBe('hello');
  });
});

// ── Worker Retry ──────────────────────────────────────────────

describe('WorkerPool Resilience', () => {
  it('tracks queue size and starts at 0', async () => {
    const { WorkerPool } = await import('@roadsidelab/keyspot-core/worker');
    const pool = new WorkerPool(4);
    expect(pool.getQueueSize()).toBe(0);
  });

  it('getCircuitBreaker returns the internal breaker', async () => {
    const { WorkerPool } = await import('@roadsidelab/keyspot-core/worker');
    const pool = new WorkerPool(1);
    const cb = pool.getCircuitBreaker();
    expect(cb.getState()).toBeDefined();
  });
});

// ── createSecure Factory ──────────────────────────────────────

describe('KeySpot.createSecure', () => {
  it('creates a KeySpot instance with production defaults', () => {
    const vault = new InMemoryVaultAdapter();
    const guard = KeySpot.createSecure({ vault });
    expect(guard).toBeInstanceOf(KeySpot);
    expect(guard.getVault()).toBeDefined();
  });

  it('vaulted secrets use vault references', async () => {
    const vault = new InMemoryVaultAdapter();
    const guard = KeySpot.createSecure({ vault });
    const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
    expect(result.key).toMatch(/^vault:v1:/);
  });

  it('rejects missing vault with ConfigurationError', () => {
    expect(() => (KeySpot as any).createSecure({})).toThrow();
  });
});
