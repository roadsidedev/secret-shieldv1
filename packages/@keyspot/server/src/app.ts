import express, { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import crypto from 'node:crypto';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { KeySpotError, toStatusCode } from '@roadsidelab/keyspot-core/errors';
import { logger } from '@roadsidelab/keyspot-core/logger';
import { createX402Middleware, type X402Config } from './payments/index.js';
import { metricsMiddleware, metricsHandler } from './metrics.js';
import { prisma } from './utils/prisma.js';
import { getRedis } from './utils/redis.js';
import authRoutes from './routes/auth.js';
import apiKeyRoutes from './routes/api-keys.js';
import metricsRoutes from './routes/metrics.js';
import stripeWebhookRoutes from './routes/stripe-webhook.js';
import billingRoutes from './routes/billing.js';
import migrationRoutes from './routes/migration.js';
import { createMcpRouter } from './routes/mcp.js';
import { requireSubscription } from './middleware/requireSubscription.js';
import { usageTracker } from './middleware/usageTracker.js';
import { requireAuth } from './middleware/requireAuth.js';

const checkpointSchema = z.object({
  state: z.record(z.any()).refine(v => v !== undefined, 'state is required'),
});

export interface KeySpotServerConfig {
  guard?: KeySpot;
  x402?: X402Config;
  trustedProxies?: string[];
  version?: string;
}

export function createApp(config: KeySpotServerConfig = {}): Express {
  const guard = config.guard ?? new KeySpot({ taintEnabled: true, promptShield: { enabled: true } });
  const enableX402 = !!config.x402;

  const app = express();

  if (config.trustedProxies?.length) {
    app.set('trust proxy', config.trustedProxies.join(','));
  }

  // Security headers
  app.use(helmet());

// CORS — never use wildcard with credentials
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin.split(','), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
} else {
  // In production, require explicit CORS_ORIGIN. In dev, allow localhost.
  if (process.env.NODE_ENV === 'production') {
    logger.warn('CORS_ORIGIN not set. Allowing no cross-origin requests in production.');
    app.use(cors({ origin: false, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
  } else {
    app.use(cors({ origin: 'http://localhost:3000', credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
  }
}

// Raw body for Stripe webhooks (must be before JSON parser)
app.use('/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

  // Request tracing
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    req.requestId = requestId;
    _res.setHeader('x-request-id', requestId);
    next();
  });

  // Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip ?? 'unknown',
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use(generalLimiter);

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip ?? 'unknown',
    message: { error: 'Too many auth attempts, please try again later.' },
  });

  // Metrics + Usage tracking
  app.use(metricsMiddleware);
  app.use('/api', usageTracker);

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const start = Date.now();
    _res.on('finish', () => {
      logger.info('request completed', {
        method: req.method,
        path: req.path,
        status: _res.statusCode,
        durationMs: Date.now() - start,
        requestId: (req as any).requestId,
      });
    });
    next();
  });

  // ── Health / Readiness / Liveness ──
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: config.version ?? '0.0.0',
      mode: enableX402 ? 'hybrid' : 'self-hosted',
      timestamp: Date.now(),
    });
  });

  // Liveness probe — process is alive and responding
  app.get('/livez', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Readiness probe — checks that dependencies are reachable
  app.get('/readyz', async (_req: Request, res: Response) => {
    const checks: Record<string, boolean | string> = {};
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = 'unreachable';
    }
    try {
      const redis = getRedis();
      if (redis) {
        await redis.ping();
        checks.redis = true;
      } else {
        checks.redis = 'not configured';
      }
    } catch {
      checks.redis = 'unreachable';
    }
    checks.vault = guard.getVault() !== null;
    const healthy = Object.values(checks).every(v => v === true);
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks });
  });

  // Prometheus metrics (internal-facing, requires auth)
  app.get('/metrics', requireAuth, metricsHandler);

  // ── Auth Routes ──
  app.use('/auth', authLimiter, authRoutes);

  // ── API Routes ──
  app.use('/api/keys', apiKeyRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/billing', billingRoutes);

  // ── Stripe Webhook ──
  app.use('/stripe', stripeWebhookRoutes);

  // ── x402 Payment Middleware (official) ──
  // Mounted only on /checkpoint to avoid unintended 402 responses on other routes.
  // If x402 is not configured, payments are not enforced (self-hosted mode).
  let x402Middleware: express.RequestHandler | null = null;
  if (config.x402) {
    const result = createX402Middleware(config.x402);
    x402Middleware = result.middleware;
  }

  // ── MCP (Model Context Protocol) ──
  const mcpRouter = createMcpRouter(guard);
  app.use('/mcp', mcpRouter);

  // ── Checkpoint endpoint ──
  // Policy: (x402 payment when enabled) OR (JWT/API key + active subscription).
  // Never leave requireSubscription without prior auth (req.user would always be empty).
  const checkpointHandlers: express.RequestHandler[] = [authLimiter];
  if (x402Middleware) {
    checkpointHandlers.push(x402Middleware);
  } else {
    checkpointHandlers.push(requireAuth);
    checkpointHandlers.push(requireSubscription('FREE'));
  }
  checkpointHandlers.push(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = checkpointSchema.parse(req.body);
      const cleanState = await guard.checkpoint(parsed.state);
      res.json({ cleanState });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request body', details: err.errors });
        return;
      }
      next(err);
    }
  });
  app.post('/checkpoint', ...checkpointHandlers);

  // ── Migration Routes ──
  app.use('/api/v1/migration', migrationRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', requestId: req.requestId });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestId ?? crypto.randomUUID();
    const statusCode = toStatusCode(err);
    const body: Record<string, unknown> = { error: err.message, requestId };
    if (err instanceof KeySpotError) {
      body.code = err.code;
      body.retryable = err.retryable;
    }
    if (statusCode >= 500) {
      logger.error(`Request failed: ${err.message}`, { requestId, statusCode, error: err.message });
      body.error = 'Internal server error';
    }
    res.status(statusCode).json(body);
  });

  return app;
}
