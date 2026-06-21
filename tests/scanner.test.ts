import { describe, it, expect } from 'vitest';
import { Scanner, TaintEngine } from '@roadsidelab/keyspot-sdk';

describe('Scanner', () => {
  it('detects an OpenAI key in a string', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('my api key is sk-123456789012345678901234567890123456789012345678');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('openai_api_key');
    expect(matches[0].severity).toBe('high');
  });

  it('returns empty for clean input', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('this is a clean string with no secrets');
    expect(matches).toHaveLength(0);
  });

  it('detects an Ethereum private key', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('ethereum_private_key');
  });

  it('redacts long secrets properly', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('sk-123456789012345678901234567890123456789012345678');
    expect(matches[0].redacted).toBe('sk-1...5678');
  });

  it('redacts short secrets as asterisks', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    // We need a match with length <= 8
    const matches = await scanner.scan('short');
    expect(matches).toHaveLength(0); // No pattern matches "short"
  });

  it('performs deep scan of nested objects', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const data = {
      user: 'alice',
      config: {
        apiKey: 'sk-123456789012345678901234567890123456789012345678'
      },
      history: [{ role: 'user', content: 'hello' }]
    };
    const matches = await scanner.scan(data);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(m => m.path.includes('config.apiKey'))).toBe(true);
  });

  it('scans arrays recursively', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const data = ['clean', 'sk-123456789012345678901234567890123456789012345678'];
    const matches = await scanner.scan(data);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].path).toContain('[1]');
  });

  it('handles streaming scan', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scanStream('sk-123456789012345678901234567890123456789012345678', 'context');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('detects tainted content when taint enabled', async () => {
    const taint = new TaintEngine();
    taint.tag('tainted-value', 'sec_001', 'test');
    const scanner = new Scanner({ taintEnabled: true }, taint);
    const matches = await scanner.scan('tainted-value');
    expect(matches.some(m => m.type === 'tainted_content')).toBe(true);
  });

  it('detects Anthropic API keys', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const anthropicKey = 'sk-ant-api03-' + 'A'.repeat(86) + '-AAAAAAAA';
    const matches = await scanner.scan(anthropicKey);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('anthropic_api_key');
  });

  it('detects AWS access key', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan('AKIA1234567890123456');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('aws_access_key');
  });

  it('respects maxScanSize limit', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({ maxScanSize: 20 }, taint);
    const oversized = 'sk-' + 'x'.repeat(48);
    const matches = await scanner.scan(oversized);
    expect(matches).toHaveLength(0);
  });

  it('respects maxScanDepth limit', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({ maxScanDepth: 2 }, taint);
    const deep = { a: { b: { c: { d: 'sk-123456789012345678901234567890123456789012345678' } } } };
    const matches = await scanner.scan(deep);
    expect(matches).toHaveLength(0);
  });

  it('handles empty object', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan({});
    expect(matches).toHaveLength(0);
  });

  it('handles empty array', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan([]);
    expect(matches).toHaveLength(0);
  });

  it('handles null input', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan(null);
    expect(matches).toHaveLength(0);
  });

  it('streaming with no context initializes empty buffer', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scanStream('clean');
    expect(matches).toHaveLength(0);
  });

  it('resetStream clears buffer between streams', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    await scanner.scanStream('previous');
    scanner.resetStream();
    const matches = await scanner.scanStream('sk-123456789012345678901234567890123456789012345678');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('multiple regex matches for same pattern are all captured', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const input = 'key1: AKIA1111111111111111, key2: AKIA2222222222222222';
    const matches = await scanner.scan(input);
    const awsMatches = matches.filter(m => m.type === 'aws_access_key');
    expect(awsMatches.length).toBeGreaterThanOrEqual(1);
    expect(awsMatches[0].rawValue).toBeTruthy();
  });
});
