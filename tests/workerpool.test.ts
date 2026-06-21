import { describe, it, expect } from 'vitest';

describe('WorkerPool', () => {
  it('runs scan jobs inline when worker script unavailable', async () => {
    const { WorkerPool } = await import('@roadsidelab/keyspot-core/worker');
    const pool = new WorkerPool(2);
    const result = await pool.run({ type: 'scan', data: 'sk-123456789012345678901234567890123456789012345678' });
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('openai_api_key');
  });

  it('handles queue when all workers busy', async () => {
    const { WorkerPool } = await import('@roadsidelab/keyspot-core/worker');
    const pool = new WorkerPool(1);
    const results = await Promise.all([
      pool.run({ type: 'scan', data: 'test1' }),
      pool.run({ type: 'scan', data: 'sk-123456789012345678901234567890123456789012345678' }),
    ]);
    expect(results).toHaveLength(2);
  });

  it('runs multiple concurrent scan jobs', async () => {
    const { WorkerPool } = await import('@roadsidelab/keyspot-core/worker');
    const pool = new WorkerPool(4);
    const jobs = Array.from({ length: 10 }, (_, i) =>
      pool.run({
        type: 'scan',
        data: i % 2 === 0
          ? `secret-${i}: sk-123456789012345678901234567890123456789012345678`
          : `clean-data-${i}`,
      })
    );
    const results = await Promise.all(jobs);
    expect(results).toHaveLength(10);
    const matchCounts = results.map(r => r.length);
    expect(matchCounts.some(c => c > 0)).toBe(true);
    expect(matchCounts.some(c => c === 0)).toBe(true);
  });

  it('handles large payloads without crashing', async () => {
    const { WorkerPool } = await import('@roadsidelab/keyspot-core/worker');
    const pool = new WorkerPool(2);
    const largePayload = 'sk-' + 'x'.repeat(48) + '\n'.repeat(1000) + 'AKIA' + 'X'.repeat(16);
    const result = await pool.run({ type: 'scan', data: largePayload });
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('tracks active count correctly', async () => {
    const { WorkerPool } = await import('@roadsidelab/keyspot-core/worker');
    const pool = new WorkerPool(3);
    expect(pool.getActiveCount()).toBe(0);
    expect(pool.getQueueSize()).toBe(0);

    const promises = Array.from({ length: 5 }, () =>
      pool.run({ type: 'scan', data: 'test' })
    );
    const results = await Promise.all(promises);
    expect(results).toHaveLength(5);
    expect(pool.getActiveCount()).toBe(0);
    expect(pool.getQueueSize()).toBe(0);
  });
});
