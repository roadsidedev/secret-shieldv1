export interface VaultWriteOptions {
    visibleTo?: string[];
    ttl?: number;
    tags?: Record<string, string>;
    rotationHook?: (id: string, secret: string) => Promise<string>;
}
export interface VaultReference {
    id: string;
    hmac: string;
    expiry: number;
    version: 'v1';
}
export interface VaultAdapter {
    write(secret: string, options?: VaultWriteOptions): Promise<string>;
    read(id: string, agentId?: string): Promise<string | null>;
    list(): Promise<string[]>;
    delete(id: string): Promise<boolean>;
    generateRef(id: string, secret: string, ttl?: number): string;
    verifyRef(ref: string): boolean;
}
export declare abstract class BaseVaultAdapter implements VaultAdapter {
    protected secretKey: string;
    constructor(secretKey?: string);
    abstract write(_secret: string, _options?: VaultWriteOptions): Promise<string>;
    abstract read(id: string, _agentId?: string): Promise<string | null>;
    abstract list(): Promise<string[]>;
    abstract delete(id: string): Promise<boolean>;
    generateRef(id: string, _secret: string, ttl?: number): string;
    verifyRef(ref: string): boolean;
}
export declare class InMemoryVaultAdapter extends BaseVaultAdapter {
    private store;
    write(secret: string, options?: VaultWriteOptions): Promise<string>;
    read(id: string, agentId?: string): Promise<string | null>;
    list(): Promise<string[]>;
    delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=index.d.ts.map