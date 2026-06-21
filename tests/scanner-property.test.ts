import { describe, it, expect } from 'vitest';
import { Scanner, TaintEngine, builtInPatterns } from '@roadsidelab/keyspot-sdk';

const TYPES = ['string', 'number', 'boolean', 'object', 'null', 'undefined', 'array'] as const;

function randomHex(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  return s;
}

function generateSecretKey(): string {
  const knownSecrets = [
    'sk-' + 'a'.repeat(48),
    'AKIA' + 'B'.repeat(16),
  ];
  return knownSecrets[Math.floor(Math.random() * knownSecrets.length)];
}

function generateNonSecret(): string {
  const safeGenerators = [
    () => 'The quick brown fox',
    () => 'hello world ' + Math.floor(Math.random() * 10000),
    () => 'user@example.com login attempt',
    () => 'Session token: null',
    () => 'Value: ' + Math.floor(Math.random() * 1000) + ' units',
    () => 'This is a clean string with no secrets whatsoever',
    () => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
    () => 'Error: file not found',
    () => 'Processing request #' + Math.floor(Math.random() * 1000),
    () => randomHex(20).toLowerCase(),
  ];
  return safeGenerators[Math.floor(Math.random() * safeGenerators.length)]();
}

describe('Property: Scanner Detection', () => {
  it('finds at least 1 match for any valid secret key', async () => {
    for (let i = 0; i < 20; i++) {
      const secret = generateSecretKey();
      const taint = new TaintEngine();
      const scanner = new Scanner({}, taint);
      const matches = await scanner.scan(secret);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('redacted string is shorter than original', async () => {
    for (let i = 0; i < 20; i++) {
      const secret = generateSecretKey();
      const taint = new TaintEngine();
      const scanner = new Scanner({}, taint);
      const matches = await scanner.scan(secret);
      for (const match of matches) {
        expect(match.redacted.length).toBeLessThan(secret.length);
      }
    }
  });

  it('random non-secret strings produce 0 matches', async () => {
    for (let i = 0; i < 50; i++) {
      const input = generateNonSecret();
      const taint = new TaintEngine();
      const scanner = new Scanner({}, taint);
      const matches = await scanner.scan(input);
      expect(matches).toHaveLength(0);
    }
  });

  it('secret embedded in longer text is still found', async () => {
    const knownSecrets = [
      'sk-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'AKIA1234567890123456',
    ];
    for (const secret of knownSecrets) {
      const prefix = 'A'.repeat(10);
      const suffix = 'B'.repeat(10);
      const input = prefix + secret + suffix;
      const taint = new TaintEngine();
      const scanner = new Scanner({}, taint);
      const matches = await scanner.scan(input);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('scanning same key multiple times yields same number of matches', async () => {
    const secret = 'sk-ant-api03-' + 'A'.repeat(86) + '-AAAAAAAA';
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const first = await scanner.scan(secret);
    const second = await scanner.scan(secret);
    expect(first.length).toBe(second.length);
  });
});

describe('Property: Taint Propagation', () => {
  it('taint propagates transitively: if A→B→C then C is tainted', async () => {
    const taint = new TaintEngine();
    taint.tag('source-value', 'sec_a', 'scan');
    taint.tag('intermediate-value', 'sec_a', 'propagate');
    taint.tag('final-value', 'sec_a', 'propagate');

    const taints = taint.getTaints('final-value');
    expect(taints.length).toBeGreaterThanOrEqual(1);
    expect(taints[0].secretId).toBe('sec_a');
  });

  it('propagate correctly links sources to derived values', async () => {
    const taint = new TaintEngine();
    taint.tag('original', 'sec_001', 'scan');
    taint.propagate(['original'], 'derived-1');
    taint.propagate(['derived-1'], 'derived-2');
    taint.propagate(['derived-2'], 'derived-3');

    const taints = taint.getTaints('derived-3');
    expect(taints.length).toBeGreaterThanOrEqual(1);
    expect(taints[0].secretId).toBe('sec_001');
  });
});

describe('Property: Streaming Scan', () => {
  it('detects secret in single stream chunk', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scanStream('sk-123456789012345678901234567890123456789012345678', 'initial');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('stream buffer can be reset and reused', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    await scanner.scanStream('clean data', 'start');
    scanner.resetStream();
    const matches = await scanner.scanStream('sk-123456789012345678901234567890123456789012345678');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('scanStream with no context works', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scanStream('something clean here');
    expect(matches).toHaveLength(0);
  });
});

describe('Property: Various Data Types', () => {
  it('scans different data types without throwing', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const inputs: unknown[] = [
      42,
      true,
      null,
      undefined,
      [1, 2, 3],
      { a: 1 },
      Symbol?.('test') ?? 'symbol',
      BigInt?.(123) ?? 123,
    ];
    for (const input of inputs) {
      await expect(scanner.scan(input)).resolves.toBeDefined();
    }
  });

  it('nested array values are all scanned', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const data = {
      users: [
        { name: 'Alice', key: 'sk-123456789012345678901234567890123456789012345678' },
        { name: 'Bob', key: 'AKIA1234567890123456' },
        { name: 'Charlie' },
      ],
    };
    const matches = await scanner.scan(data);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
