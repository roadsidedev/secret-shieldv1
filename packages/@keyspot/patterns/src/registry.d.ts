import { AhoCorasick } from './ahocorasick.js';
import { Pattern } from './index.js';
export interface PatternRegistryOptions {
    liveUpdateUrl?: string;
    liveUpdateIntervalMs?: number;
}
export declare class PatternRegistry {
    private options?;
    private patterns;
    private trie;
    private liveUpdateTimer?;
    constructor(initialPatterns?: Pattern[], options?: PatternRegistryOptions | undefined);
    private buildTrie;
    register(pattern: Pattern): void;
    unregister(name: string): void;
    getPatterns(): Pattern[];
    getTrie(): AhoCorasick;
    loadFromUrl(url: string): Promise<void>;
    private startLiveUpdates;
    stopLiveUpdates(): void;
}
//# sourceMappingURL=registry.d.ts.map