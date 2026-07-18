import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { KeySpot } from '@roadsidelab/keyspot-sdk';
describe('CLI', () => {
    const testDir = join(tmpdir(), `keyspot-cli-test-${Date.now()}`);
    beforeAll(() => mkdirSync(testDir, { recursive: true }));
    it('scans a file with secrets', async () => {
        const testFile = join(testDir, 'test.txt');
        writeFileSync(testFile, 'my api key is sk-123456789012345678901234567890123456789012345678');
        const guard = new KeySpot();
        const matches = await guard.scan(readFileSync(testFile, 'utf-8'));
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].type).toBe('openai_api_key');
    });
    it('detects no secrets in clean files', async () => {
        const testFile = join(testDir, 'clean.txt');
        writeFileSync(testFile, 'this is a safe file with no secrets');
        const guard = new KeySpot();
        const matches = await guard.scan(readFileSync(testFile, 'utf-8'));
        expect(matches).toHaveLength(0);
    });
    it('finds multiple secret types', async () => {
        const testFile = join(testDir, 'multi.txt');
        writeFileSync(testFile, [
            'sk-123456789012345678901234567890123456789012345678',
            'AKIA1234567890123456',
        ].join('\n'));
        const guard = new KeySpot();
        const matches = await guard.scan(readFileSync(testFile, 'utf-8'));
        expect(matches.length).toBeGreaterThanOrEqual(2);
        expect(matches.map(m => m.type)).toContain('openai_api_key');
        expect(matches.map(m => m.type)).toContain('aws_access_key');
    });
});
//# sourceMappingURL=cli.test.js.map