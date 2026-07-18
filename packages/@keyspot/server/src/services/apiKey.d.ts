import { Tier } from '@prisma/client';
export interface CreateKeyOptions {
    userId: string;
    name: string;
    scopes?: string[];
    expiresAt?: Date;
    orgId?: string;
}
export interface ApiKeyResult {
    id: string;
    prefix: string;
    name: string;
    plaintext: string;
    scopes: string[];
    expiresAt: Date | null;
    createdAt: Date;
}
export declare function getTierLimits(tier: Tier): {
    maxKeys: number;
    rateLimit: number;
    requestsPerMonth: number;
    maxSecretsVaulted: number;
} | {
    maxKeys: number;
    rateLimit: number;
    requestsPerMonth: number;
    maxSecretsVaulted: number;
} | {
    maxKeys: number;
    rateLimit: number;
    requestsPerMonth: number;
    maxSecretsVaulted: number;
};
export declare function createKey(options: CreateKeyOptions): Promise<ApiKeyResult>;
export declare function listKeys(userId: string): Promise<Omit<ApiKeyResult, 'plaintext'>[]>;
export declare function revokeKey(keyId: string, userId: string): Promise<void>;
export declare function validateKey(plaintext: string): Promise<{
    valid: boolean;
    userId?: string;
    tier?: Tier;
    keyId?: string;
    scopes?: string[];
}>;
//# sourceMappingURL=apiKey.d.ts.map