import { ScannerOptions, Match } from './scanner.js';
import { TaintEngine } from './taint.js';
import { VaultAdapter } from '@roadsidelab/keyspot-vault';
import { AuditLogger, PromptShieldRule } from './security.js';
import { KeySpotTracer, Tracer } from './telemetry.js';
import { BaseVectorStoreAdapter } from './adapters.js';
export declare enum CheckpointTrigger {
    SCAN = "SCAN",
    VAULT_WRITE = "VAULT_WRITE",
    TAINT_REDACT = "TAINT_REDACT",
    PROMPT_VALIDATION = "PROMPT_VALIDATION",
    BEFORE_EMBED = "BEFORE_EMBED"
}
export declare enum PrunerStrategy {
    /** Replace secret with vault reference, tag ref as tainted */
    VAULT_WITH_TAINT = "vault_with_taint",
    /** Replace secret with "[REDACTED]" — no vault storage */
    REDACT = "redact",
    /** Remove the field entirely */
    REMOVE = "remove",
    /** Replace with a configurable placeholder string */
    REPLACE = "replace"
}
export interface HostedConfig {
    enabled: boolean;
    agentWalletAddress?: string;
    facilitatorUrl?: string;
}
export interface KeySpotConfig extends ScannerOptions {
    vault?: VaultAdapter;
    workerPool?: {
        size: number;
    };
    onSecretFound?: (match: Match) => Promise<void>;
    rotationHook?: (match: Match) => Promise<string | null>;
    promptShield?: {
        enabled: boolean;
        rules?: PromptShieldRule[];
    };
    tracer?: Tracer;
    pruneStrategy?: PrunerStrategy;
    placeholder?: string;
    vectorStores?: BaseVectorStoreAdapter[];
    checkpointTriggers?: Set<CheckpointTrigger>;
    onCheckpointTrigger?: (trigger: CheckpointTrigger, context: Record<string, unknown>) => Promise<void>;
    enableOpenTelemetry?: boolean;
    hosted?: HostedConfig;
}
export declare class KeySpot {
    private config;
    private scanner;
    private vault;
    private taintEngine;
    private promptShield?;
    private auditLogger;
    private onSecretFound?;
    private rotationHook?;
    protected tracer: KeySpotTracer;
    private pruneStrategy;
    private placeholder;
    private vectorStores;
    private triggers;
    private onTrigger?;
    private accessToken?;
    private hostedConfig;
    constructor(config?: KeySpotConfig);
    getVault(): VaultAdapter;
    getTaintEngine(): TaintEngine;
    getAuditLogger(): AuditLogger;
    wrapVectorStore<T>(adapter: BaseVectorStoreAdapter, store?: T): T;
    scan(data: any): Promise<Match[]>;
    stream(tokens: string, context?: string): Promise<Match[]>;
    checkpoint(state: any): Promise<any>;
    private _checkpoint;
    private handleRawMatch;
    validatePrompt(prompt: string): Promise<{
        blocked: boolean;
        findings: string[];
    }>;
    private replaceAtPath;
    wrap<T>(fn: (...args: any[]) => Promise<T>, state: any): Promise<T>;
    private emitTrigger;
    setAccessToken(token: string, expiresAt?: number): void;
    private checkHostedAccess;
    private obtainFacilitatorToken;
}
//# sourceMappingURL=index.d.ts.map