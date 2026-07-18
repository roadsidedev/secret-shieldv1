import { BaseVaultAdapter, VaultWriteOptions } from './index.js';
export declare class AWSSecretsAdapter extends BaseVaultAdapter {
    private client;
    constructor(config: {
        region: string;
        secretKey?: string;
    });
    write(secret: string, options?: VaultWriteOptions): Promise<string>;
    read(id: string, _agentId?: string): Promise<string | null>;
    list(): Promise<string[]>;
    delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=aws.d.ts.map