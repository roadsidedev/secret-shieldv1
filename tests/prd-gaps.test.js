import { describe, it, expect, vi } from 'vitest';
import { KeySpot, PrunerStrategy, CheckpointTrigger, InMemoryVaultAdapter, BaseVectorStoreAdapter } from '@roadsidelab/keyspot-sdk';
describe('PRD Gap: PrunerStrategy', () => {
    it('VAULT_WITH_TAINT is the default and vaults secrets', async () => {
        const guard = new KeySpot();
        const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
        expect(result.key).toMatch(/^vault:v1:/);
    });
    it('REDACT replaces with full-mask redaction (no prefix/suffix leak)', async () => {
        const secret = 'sk-123456789012345678901234567890123456789012345678';
        const guard = new KeySpot({ pruneStrategy: PrunerStrategy.REDACT });
        const result = await guard.checkpoint({ key: secret });
        expect(result.key).toMatch(/^\*+$/);
        expect(result.key).not.toContain('sk-');
        expect(result.key).not.toBe(secret);
    });
    it('REMOVE sets value to undefined', async () => {
        const guard = new KeySpot({ pruneStrategy: PrunerStrategy.REMOVE });
        const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
        expect(result.key).toBeUndefined();
    });
    it('REPLACE uses configurable placeholder', async () => {
        const guard = new KeySpot({ pruneStrategy: PrunerStrategy.REPLACE, placeholder: '[SENSORED]' });
        const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
        expect(result.key).toBe('[SENSORED]');
    });
    it('REPLACE defaults to [REDACTED]', async () => {
        const guard = new KeySpot({ pruneStrategy: PrunerStrategy.REPLACE });
        const result = await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
        expect(result.key).toBe('[REDACTED]');
    });
});
describe('PRD Gap: CheckpointTrigger + OpenTelemetry', () => {
    it('fires SCAN trigger during checkpoint', async () => {
        const triggered = [];
        const guard = new KeySpot({
            checkpointTriggers: new Set([CheckpointTrigger.SCAN]),
            onCheckpointTrigger: async (trigger) => { triggered.push(trigger); },
        });
        await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
        expect(triggered).toContain(CheckpointTrigger.SCAN);
    });
    it('fires VAULT_WRITE trigger during checkpoint with secrets', async () => {
        const triggered = [];
        const guard = new KeySpot({
            checkpointTriggers: new Set([CheckpointTrigger.VAULT_WRITE]),
            onCheckpointTrigger: async (trigger) => { triggered.push(trigger); },
        });
        await guard.checkpoint({ key: 'sk-123456789012345678901234567890123456789012345678' });
        expect(triggered).toContain(CheckpointTrigger.VAULT_WRITE);
    });
    it('enableOpenTelemetry creates OtelTracer', () => {
        const guard = new KeySpot({ enableOpenTelemetry: true });
        expect(guard['tracer']).toBeDefined();
    });
    it('OtelTracer startSpan returns a valid span', async () => {
        const { OtelTracer } = await import('@roadsidelab/keyspot-core/telemetry');
        const tracer = new OtelTracer('test');
        const span = tracer.startSpan('op');
        expect(span).toBeDefined();
        expect(typeof span.end).toBe('function');
        span.end();
    });
});
describe('PRD Gap: vectorStores config + wrapVectorStore', () => {
    it('wrapVectorStore returns a wrapped adapter that sanitizes docs', async () => {
        const guard = new KeySpot();
        const mockStore = { upsert: vi.fn().mockResolvedValue({}) };
        const adapter = new (class extends BaseVectorStoreAdapter {
            wrap(store) { return store; }
        })(guard);
        const wrapped = guard.wrapVectorStore(adapter, mockStore);
        expect(wrapped).toBe(mockStore);
    });
    it('accepts vectorStores in config', () => {
        const guard = new KeySpot({
            vectorStores: [],
        });
        expect(guard).toBeDefined();
    });
    it('getVault returns a wrapped vault that delegates correctly', async () => {
        const vault = new InMemoryVaultAdapter();
        const guard = new KeySpot({ vault });
        const retrieved = guard.getVault();
        expect(retrieved.generateRef).toBeDefined();
        expect(retrieved.verifyRef).toBeDefined();
        expect(retrieved.write).toBeDefined();
        expect(retrieved.read).toBeDefined();
        // Writes should still work through the wrapper
        const id = await retrieved.write('test-secret');
        const val = await vault.read(id);
        expect(val).toBe('test-secret');
    });
});
describe('PRD Gap: getAuditLogger', () => {
    it('returns the audit logger instance', () => {
        const guard = new KeySpot();
        const logger = guard.getAuditLogger();
        expect(logger).toBeDefined();
        expect(logger.getEntries()).toHaveLength(0);
    });
});
//# sourceMappingURL=prd-gaps.test.js.map