import { describe, it, expect } from 'vitest';
import { generateSigningKeyPair, signEntry, verifyEntrySignature, PersistedAuditLogger } from '@roadsidelab/keyspot-sdk';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
describe('Compliance & Audit', () => {
    describe('Ed25519 Signing', () => {
        it('generates a valid signing key pair', () => {
            const kp = generateSigningKeyPair();
            expect(kp.publicKey.length).toBeGreaterThan(0);
            expect(kp.privateKey.length).toBeGreaterThan(0);
            expect(kp.publicKey).not.toBe(kp.privateKey);
        });
        it('signs and verifies an audit entry', () => {
            const kp = generateSigningKeyPair();
            const entry = {
                event: { type: 'test', data: 'hello' },
                timestamp: Date.now(),
                prevHash: '0'.repeat(64),
                hash: 'abc123',
            };
            const sig = signEntry(entry, kp.privateKey);
            expect(sig).toBeDefined();
            expect(sig.length).toBeGreaterThan(0);
            const valid = verifyEntrySignature(entry, sig, kp.publicKey);
            expect(valid).toBe(true);
        });
        it('rejects tampered entries', () => {
            const kp = generateSigningKeyPair();
            const entry = {
                event: { type: 'test' },
                timestamp: Date.now(),
                prevHash: '0'.repeat(64),
                hash: 'abc123',
            };
            const sig = signEntry(entry, kp.privateKey);
            const tampered = { ...entry, event: { type: 'tampered' } };
            const valid = verifyEntrySignature(tampered, sig, kp.publicKey);
            expect(valid).toBe(false);
        });
    });
    describe('PersistedAuditLogger', () => {
        function makeLogger() {
            const dir = join(tmpdir(), `keyspot-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
            const kp = generateSigningKeyPair();
            const logger = new PersistedAuditLogger({ logDir: dir, signingKeyPair: kp });
            return { logger, dir, kp };
        }
        it('writes signed entries to disk', () => {
            const { logger, dir } = makeLogger();
            logger.logSigned({ type: 'test', action: 'checkpoint' });
            logger.close();
            const files = readdirSync(dir).filter(f => f.startsWith('audit-'));
            expect(files.length).toBeGreaterThan(0);
            const content = readFileSync(join(dir, files[0]), 'utf-8');
            const lines = content.split('\n').filter(Boolean);
            expect(lines.length).toBe(1);
            const parsed = JSON.parse(lines[0]);
            expect(parsed.entry.event.type).toBe('test');
            expect(parsed.signature).toBeDefined();
            expect(parsed.chainRootHash).toBeDefined();
        });
        it('appends multiple entries and verifies chain', () => {
            const { logger, dir } = makeLogger();
            logger.logSigned({ type: 'event1' });
            logger.logSigned({ type: 'event2' });
            logger.logSigned({ type: 'event3' });
            logger.close();
            const result = logger.verifyAgainstFile();
            expect(result.valid).toBe(true);
            expect(result.entries).toBe(3);
        });
        it('detects tampered log files', () => {
            const { logger, dir } = makeLogger();
            logger.logSigned({ type: 'event1' });
            logger.logSigned({ type: 'event2' });
            logger.close();
            const files = readdirSync(dir).filter(f => f.startsWith('audit-'));
            const logFile = join(dir, files[0]);
            const content = readFileSync(logFile, 'utf-8');
            const lines = content.split('\n').filter(Boolean);
            const parsed = JSON.parse(lines[1]);
            parsed.entry.event.type = 'tampered';
            writeFileSync(logFile, lines[0] + '\n' + JSON.stringify(parsed) + '\n');
            const result = logger.verifyAgainstFile(logFile);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
        it('generates unique chain roots per entry', () => {
            const { logger } = makeLogger();
            const e1 = logger.logSigned({ type: 'a' });
            const e2 = logger.logSigned({ type: 'b' });
            logger.close();
            expect(e1.chainRootHash).toBeDefined();
            expect(e2.chainRootHash).toBeDefined();
            expect(e1.chainRootHash).not.toBe(e2.chainRootHash);
        });
    });
});
//# sourceMappingURL=compliance.test.js.map