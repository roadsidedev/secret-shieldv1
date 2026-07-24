export declare class ApiError extends Error {
    status: number;
    constructor(message: string, status: number);
}
export declare const api: {
    get: <T>(path: string, token?: string) => Promise<T>;
    post: <T>(path: string, body?: unknown, token?: string) => Promise<T>;
    patch: <T>(path: string, body?: unknown, token?: string) => Promise<T>;
    delete: <T>(path: string, token?: string) => Promise<T>;
    login: (email: string, password: string) => Promise<any>;
    register: (email: string, password: string, name?: string) => Promise<any>;
    logout: () => Promise<any>;
    getMe: (token: string) => Promise<any>;
    createApiKey: (name: string, scopes?: string[], token?: string) => Promise<any>;
    listApiKeys: (token?: string) => Promise<any[]>;
    revokeApiKey: (id: string, token?: string) => Promise<any>;
    getKeyUsage: (id: string, period?: string, token?: string) => Promise<any>;
    getUsage: (period?: string, token?: string) => Promise<any>;
    getQuotas: (token?: string) => Promise<any>;
    getBreakdown: (period?: string, token?: string) => Promise<any>;
    createCheckout: (tier: string, token?: string) => Promise<any>;
    createPortal: (token?: string) => Promise<any>;
    updateProfile: (data: any, token?: string) => Promise<any>;
};
//# sourceMappingURL=api.d.ts.map