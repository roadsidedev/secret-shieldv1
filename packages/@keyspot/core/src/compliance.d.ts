import { AuditEntry, AuditLogger } from './security.js';
export interface SigningKeyPair {
    publicKey: string;
    privateKey: string;
}
export declare function generateSigningKeyPair(): SigningKeyPair;
export declare function signEntry(entry: AuditEntry, privateKeyHex: string): string;
export declare function verifyEntrySignature(entry: AuditEntry, signatureHex: string, publicKeyHex: string): boolean;
export interface SignedAuditEntry {
    entry: AuditEntry;
    signature: string;
    publicKey: string;
    chainRootHash?: string;
}
export interface PersistedAuditLoggerOptions {
    logDir: string;
    signingKeyPair: SigningKeyPair;
    flushInterval?: number;
}
export declare class PersistedAuditLogger extends AuditLogger {
    private logPath;
    private keyPair;
    private buffer;
    private flushThreshold;
    private chainRoot;
    constructor(options: PersistedAuditLoggerOptions);
    private loadChainRoot;
    logSigned(event: Record<string, unknown>): SignedAuditEntry;
    private flush;
    verifyAgainstFile(filePath?: string): {
        valid: boolean;
        entries: number;
        errors: string[];
    };
    getChainRoot(): string;
    /**
     * Anchor the current chain root to Arbitrum One blockchain.
     * This provides tamper-proof timestamping of the audit chain.
     * Uses a public RPC endpoint — no private key needed for read-only anchoring.
     */
    anchorToArbitrum(rpcUrl?: string): Promise<{
        txHash: string;
        blockNumber: bigint;
    } | null>;
    close(): void;
}
//# sourceMappingURL=compliance.d.ts.map