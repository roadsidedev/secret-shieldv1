export declare function useMe(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useApiKeys(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCreateApiKey(): import("@tanstack/react-query").UseMutationResult<unknown, Error, {
    name: string;
    scopes?: string[];
}, unknown>;
export declare function useRevokeApiKey(): import("@tanstack/react-query").UseMutationResult<unknown, Error, string, unknown>;
export declare function useUsage(period?: string): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useQuotas(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useBreakdown(period?: string): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useKeyUsage(keyId: string, period?: string): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCreateCheckout(): import("@tanstack/react-query").UseMutationResult<unknown, Error, string, unknown>;
export declare function usePortal(): import("@tanstack/react-query").UseMutationResult<unknown, Error, void, unknown>;
export declare function useUpdateProfile(): import("@tanstack/react-query").UseMutationResult<unknown, Error, any, unknown>;
//# sourceMappingURL=useApi.d.ts.map