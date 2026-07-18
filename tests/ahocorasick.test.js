import { describe, it, expect } from 'vitest';
import { AhoCorasick } from '@roadsidelab/keyspot-sdk';
describe('AhoCorasick', () => {
    it('returns no matches for empty keyword list', () => {
        const ac = new AhoCorasick([]);
        expect(ac.search('hello world')).toHaveLength(0);
        expect(ac.hasMatch('hello world')).toBe(false);
    });
    it('finds a single keyword', () => {
        const ac = new AhoCorasick(['hello']);
        const results = ac.search('hello world');
        expect(results).toHaveLength(1);
        expect(results[0].keyword).toBe('hello');
        expect(results[0].index).toBe(0);
    });
    it('finds multiple keywords', () => {
        const ac = new AhoCorasick(['he', 'she', 'his', 'hers']);
        const results = ac.search('ushers');
        const keywords = results.map(r => r.keyword);
        expect(keywords).toContain('he');
        expect(keywords).toContain('she');
        expect(keywords).toContain('hers');
    });
    it('finds overlapping keywords', () => {
        const ac = new AhoCorasick(['a', 'ab', 'abc']);
        const results = ac.search('abc');
        expect(results.length).toBeGreaterThanOrEqual(2);
        expect(results.some(r => r.keyword === 'a')).toBe(true);
    });
    it('detects keyword at the start of text', () => {
        const ac = new AhoCorasick(['hello']);
        const results = ac.search('hello');
        expect(results).toHaveLength(1);
        expect(results[0].index).toBe(0);
    });
    it('detects keyword at the end of text', () => {
        const ac = new AhoCorasick(['world']);
        const results = ac.search('hello world');
        const found = results.some(r => r.keyword === 'world');
        expect(found).toBe(true);
    });
    it('returns no matches when keyword is absent', () => {
        const ac = new AhoCorasick(['xyz']);
        expect(ac.search('hello world')).toHaveLength(0);
    });
    it('keywords that are substrings of other keywords all match', () => {
        const ac = new AhoCorasick(['cat', 'catalog', 'catastrophe']);
        const results = ac.search('The catalog contains a catastrophe about cats.');
        const keywords = [...new Set(results.map(r => r.keyword))];
        expect(keywords).toContain('cat');
        expect(keywords).toContain('catalog');
    });
    it('empty text produces no matches', () => {
        const ac = new AhoCorasick(['hello']);
        expect(ac.search('')).toHaveLength(0);
    });
    it('hasMatch returns true when keyword exists', () => {
        const ac = new AhoCorasick(['secret']);
        expect(ac.hasMatch('this is a secret')).toBe(true);
    });
    it('hasMatch returns false when no keyword exists', () => {
        const ac = new AhoCorasick(['secret']);
        expect(ac.hasMatch('this is safe')).toBe(false);
    });
    it('handles Unicode keywords', () => {
        const ac = new AhoCorasick(['café', 'résumé']);
        const results = ac.search('mon café et mon résumé');
        expect(results).toHaveLength(2);
    });
    it('handles unicode characters in keywords', () => {
        const ac = new AhoCorasick(['café', 'résumé']);
        const results = ac.search('mon café et mon résumé');
        expect(results).toHaveLength(2);
    });
    it('finds all occurrences of the same keyword', () => {
        const ac = new AhoCorasick(['foo']);
        const results = ac.search('foo bar foo baz foo');
        expect(results.filter(r => r.keyword === 'foo')).toHaveLength(3);
    });
});
//# sourceMappingURL=ahocorasick.test.js.map