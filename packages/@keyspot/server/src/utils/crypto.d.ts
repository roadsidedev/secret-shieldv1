export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function generateApiKey(prefix?: string): {
    plaintext: string;
    hash: string;
};
export declare function verifyApiKey(plaintext: string, hash: string): boolean;
export declare function getApiKeyPrefix(key: string): string | null;
export declare function generateToken(bytes?: number): string;
export declare function generateOtp(): string;
export declare function hashToken(token: string): string;
//# sourceMappingURL=crypto.d.ts.map