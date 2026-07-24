"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.ApiError = void 0;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
async function request(path, options = {}, accessToken) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new ApiError(body.error || 'Request failed', res.status);
    }
    return res.json();
}
exports.api = {
    get: (path, token) => request(path, { method: 'GET' }, token),
    post: (path, body, token) => request(path, { method: 'POST', body: JSON.stringify(body) }, token),
    patch: (path, body, token) => request(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
    delete: (path, token) => request(path, { method: 'DELETE' }, token),
    // Auth endpoints
    login: (email, password) => request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),
    register: (email, password, name) => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
    }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getMe: (token) => request('/auth/me', { method: 'GET' }, token),
    // API Keys
    createApiKey: (name, scopes, token) => request('/api/keys', { method: 'POST', body: JSON.stringify({ name, scopes }) }, token),
    listApiKeys: (token) => request('/api/keys', { method: 'GET' }, token),
    revokeApiKey: (id, token) => request(`/api/keys/${id}`, { method: 'DELETE' }, token),
    getKeyUsage: (id, period, token) => request(`/api/keys/${id}/usage?period=${period || '7d'}`, { method: 'GET' }, token),
    // Metrics
    getUsage: (period, token) => request(`/api/metrics/usage?period=${period || '7d'}`, { method: 'GET' }, token),
    getQuotas: (token) => request('/api/metrics/quotas', { method: 'GET' }, token),
    getBreakdown: (period, token) => request(`/api/metrics/breakdown?period=${period || '7d'}`, { method: 'GET' }, token),
    // Billing
    createCheckout: (tier, token) => request('/api/billing/create-checkout', { method: 'POST', body: JSON.stringify({ tier }) }, token),
    createPortal: (token) => request('/api/billing/portal', { method: 'POST' }, token),
    // Profile
    updateProfile: (data, token) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }, token),
};
//# sourceMappingURL=api.js.map