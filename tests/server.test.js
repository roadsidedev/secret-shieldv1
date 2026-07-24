process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';
process.env.MIGRATION_SECRET = 'test-migration-secret-for-vitest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { createApp } from '../packages/@keyspot/server/src/app.js';
vi.mock('../packages/@keyspot/server/src/middleware/requireSubscription.js', () => ({
    requireSubscription: () => (_req, _res, next) => next(),
}));
vi.mock('../packages/@keyspot/server/src/routes/stripe-webhook.js', () => ({
    default: (() => { const r = require('express').Router(); r.post('/webhook', (req, res) => res.json({ received: true })); return r; })(),
}));
vi.mock('../packages/@keyspot/server/src/routes/migration.js', () => ({
    default: (() => { const r = require('express').Router(); r.post('/import', (req, res) => res.json({ success: true })); return r; })(),
}));
const app = createApp();
const server = http.createServer(app);
let baseUrl;
beforeAll(async () => {
    await new Promise((resolve) => server.listen(0, resolve));
    const addr = server.address();
    baseUrl = `http://localhost:${addr.port}`;
});
afterAll(async () => {
    await new Promise((resolve) => server.close(() => resolve()));
});
describe('Server API (self-hosted, no x402)', () => {
    it('GET /health returns status', async () => {
        const res = await fetch(`${baseUrl}/health`);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.status).toBe('ok');
        expect(body.version).toBeDefined();
        expect(body.mode).toBe('self-hosted');
    });
    it('POST /checkpoint validates request body', async () => {
        const res = await fetch(`${baseUrl}/checkpoint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: null }),
        });
        expect(res.status).toBe(400);
    });
    it('POST /checkpoint scans and returns clean state', async () => {
        const res = await fetch(`${baseUrl}/checkpoint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                state: { key: 'sk-123456789012345678901234567890123456789012345678' },
            }),
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.cleanState.key).toMatch(/^vault:v1:/);
    });
    it('POST /checkpoint passes clean state through', async () => {
        const res = await fetch(`${baseUrl}/checkpoint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: { message: 'hello' } }),
        });
        const body = await res.json();
        expect(body.cleanState.message).toBe('hello');
    });
    it('returns 404 for unknown routes', async () => {
        const res = await fetch(`${baseUrl}/unknown`);
        expect(res.status).toBe(404);
    });
    it('GET /metrics requires authentication', async () => {
        const res = await fetch(`${baseUrl}/metrics`);
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=server.test.js.map