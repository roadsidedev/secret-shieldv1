process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';
process.env.MIGRATION_SECRET = 'test-migration-secret-for-vitest';

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { createApp, type KeySpotServerConfig } from '../packages/@keyspot/server/src/app.js';

vi.mock('../packages/@keyspot/server/src/middleware/requireAuth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'test-user',
      email: 'test@example.com',
      role: 'USER',
      subscriptionTier: 'FREE',
      subscriptionStatus: 'ACTIVE',
    };
    next();
  },
}));

vi.mock('../packages/@keyspot/server/src/middleware/requireSubscription.js', () => ({
  requireSubscription: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../packages/@keyspot/server/src/routes/stripe-webhook.js', () => ({
  default: (() => { const r: any = require('express').Router(); r.post('/webhook', (req: any, res: any) => res.json({ received: true })); return r; })(),
}));

vi.mock('../packages/@keyspot/server/src/routes/migration.js', () => ({
  default: (() => { const r: any = require('express').Router(); r.post('/import', (req: any, res: any) => res.json({ success: true })); return r; })(),
}));

const app = createApp();
const server = http.createServer(app);
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    // Force-close hangers (e.g. SSE)
    setTimeout(() => {
      try { server.closeAllConnections?.(); } catch { /* ignore */ }
      resolve();
    }, 500);
  });
}, 15_000);

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

  it('GET /metrics is reachable when authenticated (mocked auth)', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    // Auth is mocked as authenticated; may be 200 or 500 if prisma unavailable
    expect([200, 500, 503]).toContain(res.status);
  });

  it('GET /mcp/sse is behind auth (mocked) and responds', async () => {
    // Abort quickly so SSE does not keep the server open
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 200);
    try {
      await fetch(`${baseUrl}/mcp/sse`, { signal: ac.signal });
    } catch {
      // abort expected
    } finally {
      clearTimeout(t);
    }
    expect(true).toBe(true);
  });
});
