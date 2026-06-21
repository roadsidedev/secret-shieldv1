import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeySpot } from '@roadsidelab/keyspot-sdk';

describe('KeySpot Hosted Access (x402)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not require payment when hosted is not configured', async () => {
    const guard = new KeySpot();
    const state = { test: 'hello' };
    const clean = await guard.checkpoint(state);
    expect(clean.test).toBe('hello');
  });

  it('does not require payment when hosted is not enabled', async () => {
    const guard = new KeySpot({ hosted: { enabled: false } });
    const state = { test: 'hello' };
    const clean = await guard.checkpoint(state);
    expect(clean.test).toBe('hello');
  });

  it('throws 402 when hosted is enabled but no access configured', async () => {
    const guard = new KeySpot({ hosted: { enabled: true } });
    const state = { test: 'hello' };
    await expect(guard.checkpoint(state)).rejects.toThrow(/PaymentRequiredError|requires x402 payment/);
  });

  it('accepts a pre-set access token', async () => {
    const guard = new KeySpot({ hosted: { enabled: true } });
    guard.setAccessToken('test-token-valid', Date.now() + 60_000);
    const state = { test: 'hello' };
    const clean = await guard.checkpoint(state);
    expect(clean.test).toBe('hello');
  });

  it('rejects expired access tokens', async () => {
    const guard = new KeySpot({ hosted: { enabled: true } });
    guard.setAccessToken('test-token-expired', Date.now() - 1);
    const state = { test: 'hello' };
    await expect(guard.checkpoint(state)).rejects.toThrow(/PaymentRequiredError|requires x402 payment/);
  });

  it('includes facilitator URL in error when configured', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('unreachable'));
    const guard = new KeySpot({
      hosted: {
        enabled: true,
        facilitatorUrl: 'https://x402.org/facilitator',
      },
    });
    const state = { test: 'hello' };
    try {
      await guard.checkpoint(state);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.code).toBe('PAYMENT_REQUIRED');
      expect(err.details?.facilitatorUrl).toBe('https://x402.org/facilitator');
    }
  });

  it('attempts facilitator token fetch when facilitator URL is set', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'facilitator-token', expiresInMs: 120_000 }),
    });
    global.fetch = mockFetch;

    const guard = new KeySpot({
      hosted: {
        enabled: true,
        facilitatorUrl: 'https://x402.org/facilitator',
        agentWalletAddress: '0x1234',
      },
    });
    const state = { test: 'hello' };
    const clean = await guard.checkpoint(state);
    expect(clean.test).toBe('hello');
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toBe('https://x402.org/facilitator/api/v1/access-tokens');
  });

  it('recovers from facilitator failure and rejects access', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const guard = new KeySpot({
      hosted: {
        enabled: true,
        facilitatorUrl: 'https://x402.org/facilitator',
      },
    });
    const state = { test: 'hello' };
    await expect(guard.checkpoint(state)).rejects.toThrow(/PaymentRequiredError|requires x402 payment/);
  });

  it('still vaults secrets in hosted mode with valid token', async () => {
    const guard = new KeySpot({
      hosted: { enabled: true },
      taintEnabled: true,
    });
    guard.setAccessToken('valid-token', Date.now() + 60_000);
    const state = { key: 'sk-123456789012345678901234567890123456789012345678' };
    const clean = await guard.checkpoint(state);
    expect(clean.key).toMatch(/^vault:v1:/);
  });
});
