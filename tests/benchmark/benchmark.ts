#!/usr/bin/env node
/**
 * KeySpot Benchmark Suite
 * Measures checkpoint, scan, and vault performance.
 *
 * Usage: node dist/benchmark.js [--iterations 100]
 */
import { KeySpot } from '@roadsidelab/keyspot-core';
import { builtInPatterns } from '@roadsidelab/keyspot-patterns';

const iterations = parseInt(process.argv[2] || '100', 10);

function generateLargeObject(depth: number, breadth: number): any {
  if (depth <= 0) return `sk-${'x'.repeat(48)}`;
  const obj: any = {};
  for (let i = 0; i < breadth; i++) {
    obj[`key_${i}`] = generateLargeObject(depth - 1, breadth);
  }
  return obj;
}

async function benchmark(name: string, iterations: number, fn: () => Promise<void>): Promise<void> {
  // Warmup
  for (let i = 0; i < 10; i++) await fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) await fn();
  const total = performance.now() - start;
  const avg = total / iterations;

  console.log(`${name}:`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Total: ${total.toFixed(2)}ms`);
  console.log(`  Avg: ${avg.toFixed(4)}ms`);
  console.log(`  Ops/sec: ${(1000 / avg).toFixed(2)}`);
}

async function main() {
  console.log(`\nKeySpot Benchmark Suite (${iterations} iterations)\n`);

  // 1. Small object scan
  const guard = new KeySpot({ taintEnabled: true });
  const smallObj = { message: 'hello', key: 'sk-123456789012345678901234567890123456789012345678' };
  await benchmark('checkpoint (small object, 1 secret)', iterations, () =>
    guard.checkpoint(smallObj),
  );

  // 2. Clean object (no secrets)
  const cleanObj = { user: 'alice', message: 'hello world', count: 42 };
  await benchmark('checkpoint (clean object)', iterations, () =>
    guard.checkpoint(cleanObj),
  );

  // 3. Large deep object (100+ nodes)
  const largeObj = generateLargeObject(4, 5);
  await benchmark('checkpoint (large object ~500 nodes)', iterations, () =>
    guard.checkpoint(largeObj),
  );

  // 4. String scan only
  await benchmark('scan (string with secret)', iterations, () =>
    guard.scan('sk-123456789012345678901234567890123456789012345678'),
  );

  // 5. Vault operations
  await benchmark('vault write + generateRef', iterations, async () => {
    const v = await guard['vault'].write('test-secret');
    guard['vault'].generateRef(v, 'test-secret');
  });

  console.log('\nDone.\n');
}

main().catch(console.error);
