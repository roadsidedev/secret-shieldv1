import { Pattern } from '@roadsidelab/keyspot-patterns';
import { TaintEngine } from './taint.js';
export interface Match {
    type: string;
    severity: string;
    path: string;
    redacted: string;
    confidence: number;
    secretId?: string;
    sourceSecretIds?: string[];
    rawValue?: string;
}
export interface ScannerOptions {
    patterns?: Pattern[];
    deepScan?: boolean;
    includeBase64?: boolean;
    contextWindow?: number;
    taintEnabled?: boolean;
}
export declare class Scanner {
    private patterns;
    private taintEngine;
    private taintEnabled;
    constructor(options: ScannerOptions | undefined, taintEngine: TaintEngine);
    /**
     * Performs a deep scan of the provided data structure.
     */
    scan(data: any, path?: string): Promise<Match[]>;
    private streamBuffer;
    private readonly streamWindowSize;
    /**
     * Incremental scanning for streaming tokens with windowing and buffer management.
     * Maintains a rolling window of recent tokens to detect secrets spanning arrivals.
     */
    scanStream(tokens: string, context?: string): Promise<Match[]>;
    /** Reset the streaming buffer for a new stream. */
    resetStream(): void;
    private redact;
}
//# sourceMappingURL=scanner.d.ts.map