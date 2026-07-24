import { describe, it, expect } from 'vitest';
import { TaintEngine } from '@roadsidelab/keyspot-sdk';
describe('TaintEngine', () => {
    it('tags a value and retrieves its taints', () => {
        const engine = new TaintEngine();
        engine.tag('sk-secret-key-123', 'sec_001', 'detection');
        const taints = engine.getTaints('sk-secret-key-123');
        expect(taints).toHaveLength(1);
        expect(taints[0].secretId).toBe('sec_001');
        expect(taints[0].source).toBe('detection');
    });
    it('returns empty array for untainted value', () => {
        const engine = new TaintEngine();
        expect(engine.getTaints('clean-value')).toHaveLength(0);
    });
    it('does not duplicate taint entries for same secretId', () => {
        const engine = new TaintEngine();
        engine.tag('value', 'sec_001', 'detection');
        engine.tag('value', 'sec_001', 'detection');
        expect(engine.getTaints('value')).toHaveLength(1);
    });
    it('propagates taints from source values to derived value', () => {
        const engine = new TaintEngine();
        engine.tag('source1', 'sec_001', 'detection');
        engine.tag('source2', 'sec_002', 'detection');
        engine.propagate(['source1', 'source2'], 'derived-summary');
        const taints = engine.getTaints('derived-summary');
        expect(taints).toHaveLength(2);
        expect(taints.map(t => t.secretId)).toEqual(['sec_001', 'sec_002']);
    });
    it('removes taint on untaint', () => {
        const engine = new TaintEngine();
        engine.tag('value', 'sec_001', 'detection');
        expect(engine.getTaints('value')).toHaveLength(1);
        engine.untaint('value');
        expect(engine.getTaints('value')).toHaveLength(0);
    });
    it('handles object values', () => {
        const engine = new TaintEngine();
        const obj = { nested: 'sk-secret' };
        engine.tag(obj, 'sec_001', 'test');
        const taints = engine.getTaints(obj);
        expect(taints).toHaveLength(1);
        expect(taints[0].secretId).toBe('sec_001');
    });
});
//# sourceMappingURL=taint.test.js.map