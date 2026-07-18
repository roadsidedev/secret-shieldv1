export interface TaintMetadata {
    secretId: string;
    source: string;
    timestamp: number;
}
export declare class TaintEngine {
    private taintMap;
    /**
     * Generates a stable hash for a value to track its taint status.
     */
    private hash;
    /**
     * Tags a value as tainted by one or more secrets.
     */
    tag(value: any, secretId: string, source?: string): void;
    /**
     * Checks if a value is tainted and returns the associated secret IDs.
     */
    getTaints(value: any): TaintMetadata[];
    /**
     * Propagates taint from source values to a derived value.
     * Useful for summaries, translations, or tool outputs.
     */
    propagate(sources: any[], derived: any): void;
    /**
     * Clears taint for a specific value (e.g., after successful rotation/removal).
     */
    untaint(value: any): void;
}
//# sourceMappingURL=taint.d.ts.map