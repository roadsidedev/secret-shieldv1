"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMe = useMe;
exports.useApiKeys = useApiKeys;
exports.useCreateApiKey = useCreateApiKey;
exports.useRevokeApiKey = useRevokeApiKey;
exports.useUsage = useUsage;
exports.useQuotas = useQuotas;
exports.useBreakdown = useBreakdown;
exports.useKeyUsage = useKeyUsage;
exports.useCreateCheckout = useCreateCheckout;
exports.usePortal = usePortal;
exports.useUpdateProfile = useUpdateProfile;
const react_query_1 = require("@tanstack/react-query");
const react_1 = require("next-auth/react");
const api_1 = require("@/lib/api");
function useToken() {
    const { data: session } = (0, react_1.useSession)();
    return session?.user?.accessToken;
}
function useMe() {
    const token = useToken();
    return (0, react_query_1.useQuery)({
        queryKey: ['me'],
        queryFn: () => api_1.api.getMe(token),
        enabled: !!token,
    });
}
function useApiKeys() {
    const token = useToken();
    return (0, react_query_1.useQuery)({
        queryKey: ['apiKeys'],
        queryFn: () => api_1.api.listApiKeys(token),
        enabled: !!token,
    });
}
function useCreateApiKey() {
    const token = useToken();
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: ({ name, scopes }) => api_1.api.createApiKey(name, scopes, token),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
    });
}
function useRevokeApiKey() {
    const token = useToken();
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: (id) => api_1.api.revokeApiKey(id, token),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
    });
}
function useUsage(period = '7d') {
    const token = useToken();
    return (0, react_query_1.useQuery)({
        queryKey: ['usage', period],
        queryFn: () => api_1.api.getUsage(period, token),
        enabled: !!token,
    });
}
function useQuotas() {
    const token = useToken();
    return (0, react_query_1.useQuery)({
        queryKey: ['quotas'],
        queryFn: () => api_1.api.getQuotas(token),
        enabled: !!token,
    });
}
function useBreakdown(period = '7d') {
    const token = useToken();
    return (0, react_query_1.useQuery)({
        queryKey: ['breakdown', period],
        queryFn: () => api_1.api.getBreakdown(period, token),
        enabled: !!token,
    });
}
function useKeyUsage(keyId, period = '7d') {
    const token = useToken();
    return (0, react_query_1.useQuery)({
        queryKey: ['keyUsage', keyId, period],
        queryFn: () => api_1.api.getKeyUsage(keyId, period, token),
        enabled: !!token && !!keyId,
    });
}
function useCreateCheckout() {
    const token = useToken();
    return (0, react_query_1.useMutation)({
        mutationFn: (tier) => api_1.api.createCheckout(tier, token),
    });
}
function usePortal() {
    const token = useToken();
    return (0, react_query_1.useMutation)({
        mutationFn: () => api_1.api.createPortal(token),
    });
}
function useUpdateProfile() {
    const token = useToken();
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.api.updateProfile(data, token),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    });
}
//# sourceMappingURL=useApi.js.map