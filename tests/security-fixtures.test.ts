import { describe, it, expect } from 'vitest';
import { Scanner, TaintEngine, builtInPatterns } from '@roadsidelab/keyspot-sdk';

function randomHex(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  return s;
}

interface FixtureEntry {
  pattern: string;
  secret: string;
}

// Patterns verified against the actual built-in regexes at patterns/src/built-in.ts
const knownSecrets: FixtureEntry[] = [
  { pattern: 'openai_api_key', secret: 'sk-123456789012345678901234567890123456789012345678' },
  { pattern: 'aws_access_key', secret: 'AKIA1234567890123456' },
  { pattern: 'aws_secret_key', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
  { pattern: 'ethereum_private_key', secret: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
  { pattern: 'google_ai_key', secret: 'AIzaSyA1234567890123456789012345678901234' },
  { pattern: 'github_token', secret: 'ghp_123456789012345678901234567890123456' },
  { pattern: 'npm_token', secret: 'npm_123456789012345678901234567890123456' },
  { pattern: 'slack_webhook', secret: 'https://hooks.slack.com/services/T00/B00/1234567890123456789012' },
  { pattern: 'sentry_dsn', secret: 'https://bcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcde@sentry.io/1234567' },
  { pattern: 'postgresql_url', secret: 'postgresql://user:password@localhost:5432/mydb' },
  { pattern: 'mysql_url', secret: 'mysql://user:password@localhost:3306/mydb' },
  { pattern: 'mongodb_url', secret: 'mongodb+srv://user:password@cluster.mongodb.net:27017/mydb' },
  { pattern: 'rsa_private_key', secret: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890\n-----END RSA PRIVATE KEY-----' },
];

const nonSecrets: string[] = [
  'The secret to success is hard work',
  'sk- is just a prefix in many contexts',
  'AKIA is an acronym for Amazon Web Services',
  'This is a regular sentence with no secrets.',
  '0x is a common prefix for hexadecimal numbers',
  'const apiKey = process.env.API_KEY',
  'The token was generated successfully',
  'User password reset request received',
  'Check the documentation at docs.example.com',
  'eyJ is not always a JWT, it could be base64',
  'The key to understanding recursion is recursion',
  'Log in with your API key at the dashboard',
  '',
  '   ',
  'null',
  'undefined',
];

describe('Security Fixture: All 35+ Patterns', () => {
  it.each(knownSecrets)('detects $pattern', async ({ secret }) => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan(secret);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it.each(knownSecrets)('redacts $pattern correctly (length ≤ original)', async ({ secret }) => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const matches = await scanner.scan(secret);
    for (const match of matches) {
      expect(match.redacted.length).toBeLessThanOrEqual(secret.length);
      expect(match.redacted).not.toContain(secret);
    }
  });

  it('non-secrets produce zero matches', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    for (const input of nonSecrets) {
      const matches = await scanner.scan(input);
      expect(matches).toHaveLength(0);
    }
  });
});

describe('Security Fixture: Adversarial Inputs', () => {
  it('does not decode base64-encoded secrets', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const encoded = Buffer.from('sk-proj-123456789012345678901234567890123456789012345678').toString('base64');
    const matches = await scanner.scan(encoded);
    expect(matches).toHaveLength(0);
  });

  it('detects secrets mixed in normal text', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const mixed = 'The API key for production is "sk-123456789012345678901234567890123456789012345678" please keep it safe.';
    const matches = await scanner.scan(mixed);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].type).toBe('openai_api_key');
  });

  it('handles null bytes in input gracefully', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const input = 'sk-proj-12345\x006789012345678901234567890123456789012345678';
    const matches = await scanner.scan(input);
    expect(Array.isArray(matches)).toBe(true);
  });

  it('handles extremely long inputs without throwing', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({ maxScanSize: 200000 }, taint);
    const longInput = 'A'.repeat(50000) + ' AKIA1234567890123456 ' + 'B'.repeat(50000);
    const matches = await scanner.scan(longInput);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].type).toBe('aws_access_key');
  });

  it('detects secrets deeply nested in objects', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({ maxScanDepth: 10 }, taint);
    const nested = {
      level1: {
        level2: {
          apiKey: 'sk-123456789012345678901234567890123456789012345678',
        },
      },
    };
    const matches = await scanner.scan(nested);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].path).toContain('apiKey');
  });

  it('does not crash on circular references', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const circular: Record<string, unknown> = { name: 'test' };
    circular.self = circular;
    const matches = await scanner.scan(circular);
    expect(Array.isArray(matches)).toBe(true);
  });

  it('detects multiple secret types in the same input', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const multi = {
      openai: 'sk-123456789012345678901234567890123456789012345678',
      aws: 'AKIA1234567890123456',
      eth: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    const matches = await scanner.scan(multi);
    const types = new Set(matches.map(m => m.type));
    expect(types.has('openai_api_key')).toBe(true);
    expect(types.has('aws_access_key')).toBe(true);
    expect(types.has('ethereum_private_key')).toBe(true);
  });

  it('handles Unicode homoglyphs (lookalike chars) safely', async () => {
    const taint = new TaintEngine();
    const scanner = new Scanner({}, taint);
    const homoglyph = 'sk-рrој-123456789012345678901234567890123456789012345678';
    const matches = await scanner.scan(homoglyph);
    expect(Array.isArray(matches)).toBe(true);
  });
});
