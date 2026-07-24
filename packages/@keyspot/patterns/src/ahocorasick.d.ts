export interface AhoCorasickMatch {
    keyword: string;
    index: number;
}
export declare class AhoCorasick {
    private root;
    constructor(keywords: string[]);
    private buildTrie;
    private buildFailureLinks;
    search(text: string): AhoCorasickMatch[];
    hasMatch(text: string): boolean;
}
//# sourceMappingURL=ahocorasick.d.ts.map