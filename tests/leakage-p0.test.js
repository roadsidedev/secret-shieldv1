import { describe, it, expect } from 'vitest';
import { KeySpot, InMemoryVaultAdapter } from '@roadsidelab/keyspot-sdk';
// Re-implement strip for isolation if export path differs
function stripRaw(matches) {
    return matches.map((m) => {
        if (m && typeof m === 'object') {
            const { rawValue: _r, ...rest } = m;
            return rest;
        }
        return m;
    });
}
const OPENAI_KEY = 'sk-123456789012345678901234567890123456789012345678';
describe('P0 leakage controls', () => {
    it('scanSafe never includes rawValue', async () => {
        const guard = new KeySpot();
        const matches = await guard.scanSafe({ key: OPENAI_KEY });
        expect(matches.length).toBeGreaterThan(0);
        for (const m of matches) {
            expect(m).not.toHaveProperty('rawValue');
            expect(JSON.stringify(m)).not.toContain(OPENAI_KEY);
        }
    });
    it('checkpoint root string replaces secret', async () => {
        const guard = new KeySpot();
        const out = await guard.checkpoint(OPENAI_KEY);
        expect(typeof out).toBe('string');
        expect(out).not.toBe(OPENAI_KEY);
        expect(out).toMatch(/^vault:v1:/);
    });
    it('onSecretFound from createSecure does not receive rawValue', async () => {
        const seen = [];
        const inner = new InMemoryVaultAdapter();
        const vault = {
            write: (s, o) => inner.write(s, o),
            read: (id, a) => inner.read(id, a),
            list: () => inner.list(),
            delete: (id) => inner.delete(id),
            generateRef: (id, s, t) => inner.generateRef(id, s, t),
            verifyRef: (r) => inner.verifyRef(r),
            toWorkerConfig: () => ({ type: 'test' }),
            isInMemory: () => false,
        };
        const guard = KeySpot.createSecure({
            vault: vault,
            onSecretFound: async (m) => {
                seen.push(m);
            },
        });
        await guard.checkpoint({ key: OPENAI_KEY });
        expect(seen.length).toBeGreaterThan(0);
        for (const m of seen) {
            expect(m.rawValue).toBeUndefined();
            expect(JSON.stringify(m)).not.toContain(OPENAI_KEY);
        }
    });
    it('stripRaw removes secrets from match arrays', async () => {
        const guard = new KeySpot();
        const matches = await guard.scan({ key: OPENAI_KEY });
        const safe = stripRaw(matches);
        expect(JSON.stringify(safe)).not.toContain(OPENAI_KEY);
    });
});
//# sourceMappingURL=leakage-p0.test.js.map