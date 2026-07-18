export interface Pattern {
    name: string;
    regex: RegExp;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
}
export { builtInPatterns } from './built-in.js';
export { AhoCorasick, AhoCorasickMatch } from './ahocorasick.js';
export { PatternRegistry, PatternRegistryOptions } from './registry.js';
//# sourceMappingURL=index.d.ts.map