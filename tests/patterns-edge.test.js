import { describe, it, expect } from 'vitest';
import { Scanner, TaintEngine } from '@roadsidelab/keyspot-sdk';
const knownFalsePositives = [
    'The config file is at /etc/app/config.yaml',
    'The secret to success is hard work',
    'Your token expires in 5 minutes (not a real token)',
    'sk- is just a prefix used in many contexts',
    'The key to the puzzle was hidden',
    'AKIA is not always an AWS key, it could be an acronym',
    'Check the history of this repository',
    'Send the report to admin@example.com',
    'The timestamp is 1234567890',
    'The path to the secret is config.key',
];
const cleanStrings = [
    'Hello World',
    'This is a regular sentence with no secrets.',
    'npm install @roadsidelab/keyspot-sdk',
    "const x = 42; console.log('hello');",
    'lorem ipsum dolor sit amet',
    'user@example.com',
    'https://example.com/oauth/callback',
    'The quick brown fox jumps over the lazy dog',
    '{"name": "test", "value": 123}',
    'a1b2c3d4e5f6g7h8i9j0',
];
describe('Pattern Matching: False Positive Prevention', () => {
    it('should not flag known non-secret strings', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({}, taint);
        for (const input of knownFalsePositives) {
            const matches = await scanner.scan(input);
            expect(matches).toHaveLength(0);
        }
    });
    it('should not flag clean strings', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({}, taint);
        for (const input of cleanStrings) {
            const matches = await scanner.scan(input);
            expect(matches).toHaveLength(0);
        }
    });
});
describe('Pattern Matching: Detection Accuracy', () => {
    it('detects OpenAI key in various contexts', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({}, taint);
        const key = 'sk-123456789012345678901234567890123456789012345678';
        const tests = [
            `api_key = "${key}"`,
            `OPENAI_API_KEY=${key}`,
            `{ "key": "${key}" }`,
            `The key is ${key} in the config`,
            key,
        ];
        for (const input of tests) {
            const matches = await scanner.scan(input);
            expect(matches.length).toBeGreaterThan(0);
            expect(matches[0].type).toBe('openai_api_key');
        }
    });
    it('detects AWS access keys', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({}, taint);
        const matches = await scanner.scan('AWS_ACCESS_KEY=AKIA1234567890123456');
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].type).toBe('aws_access_key');
    });
    it('detects Ethereum private keys', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({}, taint);
        const matches = await scanner.scan('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].type).toBe('ethereum_private_key');
    });
    it('detects Anthropic API keys', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({}, taint);
        const anthropicKey = 'sk-ant-api03-' + 'A'.repeat(86) + '-AAAAAAAA';
        const matches = await scanner.scan(anthropicKey);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].type).toBe('anthropic_api_key');
    });
});
describe('Scanner: Input Size Limits', () => {
    it('respects maxScanSize for oversized strings', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({ maxScanSize: 20 }, taint);
        const oversized = 'sk-' + 'x'.repeat(48);
        const matches = await scanner.scan(oversized);
        expect(matches).toHaveLength(0);
    });
    it('respects maxScanDepth for deeply nested objects', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({ maxScanDepth: 2 }, taint);
        const deep = { a: { b: { c: { d: { e: 'sk-123456789012345678901234567890123456789012345678' } } } } };
        const matches = await scanner.scan(deep);
        expect(matches).toHaveLength(0);
    });
    it('scans within size limits normally', async () => {
        const taint = new TaintEngine();
        const scanner = new Scanner({ maxScanSize: 10000 }, taint);
        const matches = await scanner.scan('sk-123456789012345678901234567890123456789012345678');
        expect(matches.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=patterns-edge.test.js.map