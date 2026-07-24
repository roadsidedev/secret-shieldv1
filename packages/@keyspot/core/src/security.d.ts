export interface PromptShieldRule {
    name: string;
    pattern: RegExp;
    severity: 'block' | 'warn' | 'ignore';
}
export declare class PromptShield {
    private rules;
    constructor(customRules?: PromptShieldRule[]);
    analyze(prompt: string): Promise<{
        blocked: boolean;
        findings: string[];
    }>;
}
export interface AuditEntry {
    event: Record<string, unknown>;
    timestamp: number;
    prevHash: string;
    hash: string;
}
export declare class AuditLogger {
    private lastHash;
    private entries;
    log(event: Record<string, unknown>): AuditEntry;
    verifyChain(entries: AuditEntry[]): boolean;
    getEntries(): AuditEntry[];
    getLastHash(): string;
    clear(): void;
}
//# sourceMappingURL=security.d.ts.map