import { describe, it, expect } from 'vitest';
import { KeySpot, TaintEngine, Scanner } from '@roadsidelab/keyspot-sdk';
describe('Phase 2: Core Hardening', () => {
    // 2.4 Rotation Hooks
    describe('Rotation Hooks', () => {
        it('calls rotation hook when secret is found', async () => {
            const rotatedSecrets = [];
            const guard = new KeySpot({
                rotationHook: async (match) => {
                    rotatedSecrets.push(match.rawValue);
                    return 'rotated-' + match.rawValue;
                }
            });
            const state = { key: 'sk-123456789012345678901234567890123456789012345678' };
            await guard.checkpoint(state);
            expect(rotatedSecrets.length).toBeGreaterThan(0);
            expect(rotatedSecrets[0]).toContain('sk-');
        });
    });
    // 2.5 Taint Propagation Through Vault Refs
    describe('Taint Propagation', () => {
        it('tags vault references as tainted', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const taintEngine = guard.getTaintEngine();
            const state = { key: 'sk-123456789012345678901234567890123456789012345678' };
            const cleanState = await guard.checkpoint(state);
            const vaultRef = cleanState.key;
            // The vault ref itself should be tagged as tainted
            const refTaints = taintEngine.getTaints(vaultRef);
            expect(refTaints.length).toBeGreaterThan(0);
            expect(refTaints[0].source).toBe('vault_ref');
        });
        it('propagates taint to derived content', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const taintEngine = guard.getTaintEngine();
            // Tag a source value
            taintEngine.tag('original-secret', 'sec_001', 'test');
            // Propagate to derived content
            taintEngine.propagate(['original-secret'], 'derived-summary');
            const taints = taintEngine.getTaints('derived-summary');
            expect(taints).toHaveLength(1);
            expect(taints[0].secretId).toBe('sec_001');
        });
    });
    // 2.6 Context-Aware Scoring
    describe('Context-Aware Scoring', () => {
        it('scores higher for secrets in config paths', async () => {
            const taint = new TaintEngine();
            const scanner = new Scanner({}, taint);
            const configMatches = await scanner.scan('sk-123456789012345678901234567890123456789012345678', 'config.api_key');
            const chatMatches = await scanner.scan('sk-123456789012345678901234567890123456789012345678', 'history[0].content');
            expect(configMatches.length).toBeGreaterThan(0);
            expect(chatMatches.length).toBeGreaterThan(0);
            if (configMatches[0] && chatMatches[0]) {
                expect(configMatches[0].confidence).toBeGreaterThan(chatMatches[0].confidence);
            }
        });
    });
    // 2.7 Streaming Scan
    describe('Streaming Scan', () => {
        it('detects secrets across streaming windows', async () => {
            const taint = new TaintEngine();
            const scanner = new Scanner({}, taint);
            // Simulate tokens arriving in chunks
            const chunk1 = await scanner.scanStream('my api key is sk-', 'previous context...');
            const chunk2 = await scanner.scanStream('123456789012345678901234567890123456789012345678', 'previous context...');
            expect(chunk2.length).toBeGreaterThan(0);
            expect(chunk2[0].type).toBe('openai_api_key');
            scanner.resetStream();
        });
        it('maintains window buffer', async () => {
            const taint = new TaintEngine();
            const scanner = new Scanner({}, taint);
            // Fill buffer beyond window
            for (let i = 0; i < 10; i++) {
                await scanner.scanStream('a'.repeat(500) + '\n', '');
            }
            // Now send a secret - it should still be detected
            const matches = await scanner.scanStream('sk-123456789012345678901234567890123456789012345678', '');
            expect(matches.length).toBeGreaterThan(0);
            scanner.resetStream();
        });
    });
    // 2.8 Worker Pool
    describe('Worker Pool', () => {
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
    });
});
//# sourceMappingURL=phase2.test.js.map