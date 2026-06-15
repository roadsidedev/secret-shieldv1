# KeySpot SDK v2.0 — Immediate Action Plan

## 🚨 CRITICAL: Fix `server-saas/src/app.ts` (Priority 1)

**Issue:** Syntax errors preventing build
**Impact:** SaaS mode cannot be used, tests cannot run

### What to Fix
```typescript
1. Line 43: `const app = require('express')();n` → `const app = express();`
2. Line 95: `const authRoutes = require('./routes/auth.js')(enableAuth);` → `import authRoutes from './routes/auth.js';`
3. Line 99: `const apiKeyRoutes = require('./routes/api-keys.js');` → `import apiKeyRoutes from './routes/api-keys.js';`
4. Line 103: `const billingRoutes = require('./routes/billing.js');` → `import billingRoutes from './routes/billing.js';`
5. Line 109: `const stripeWebhookRoutes = require('./routes/stripe-webhook.js');` → `import stripeWebhookRoutes from './routes/stripe-webhook.js';`
6. Line 128: `const webhookMiddleware = require('express').raw({ type: 'application/json' });` → `const webhookMiddleware = express.raw({ type: 'application/json' });`
```

### Current File Preview
```typescript
const checkpointSchema = z.object({
  state: z.record(z.any()).refine(v => v !== undefined, 'state is required'),
});

export interface KeySpotSaaSConfig extends KeySpotServerConfig {
  facilitator?: X402Facilitator;
  identityRegistry: string;
  x402Network?: 'arbitrum' | 'arbitrum-sepolia';
  x402PayTo?: string;
  x402USDCAddress?: string;
  x402FreeQuota?: number;
  x402Pricing?: Record<string, string>;
  migrationSecret?: string;
}

export function createSaaSApp(config: KeySpotSaaSConfig = {}): Express {
  const guard = config.guard ?? new KeySpot({ taintEnabled: true, promptShield: { enabled: true } });
  const enableAuth = config.enableAuth ?? false;
  const enableX402 = config.enableX402 ?? true;
  const facilitator = config.facilitator;
  const identityRegistry = config.identityRegistry;
  const x402Network = config.x402Network || 'arbitrum';
  const x402PayTo = config.x402PayTo || '';
  const x402USDCAddress = config.x402USDCAddress;
  const x402FreeQuota = config.x402FreeQuota ?? 0;
  const x402Pricing = config.x402Pricing || {};
  const migrationSecret = config.migrationSecret || 'default-migration-secret';

  const app = require('express')();n  // <-- ERROR
  
  if (config.trustedProxies?.length) {
    app.set('trust proxy', config.trustedProxies.join(','));
  }

  // Security headers
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }));

  app.use(require('express')().json({ limit: '10mb' }));  // <-- ERROR

  // Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use(generalLimiter);

  // Metrics + Usage tracking middleware
  app.use(require('./middleware/usageTracker.js'));

  // Request logging
  app.use(requestLogger);

  // ── Health (includes mode info) ──
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '2.1.0',
      mode: 'hosted-saas',
      timestamp: Date.now(),
      features: {
        auth: enableAuth,
        x402: enableX402,
        stripe: !!process.env.STRIPE_SECRET_KEY,
      },
    });
  });

  // ── Agent Migration Endpoints ──
  app.use('/api/v1/migration', migrationMiddleware({ secret: migrationSecret }));

  // ── Auth Routes (from server-core) ──
  const authRoutes = require('./routes/auth.js')(enableAuth);  // <-- ERROR
  app.use('/auth', authRoutes);

  // ── API Keys Routes (from server-core) ──
  const apiKeyRoutes = require('./routes/api-keys.js');  // <-- ERROR
  app.use('/api/keys', apiKeyRoutes);

  // ── Stripe Billing Routes ──
  const billingRoutes = require('./routes/billing.js');  // <-- ERROR
  app.use('/api/billing', billingRoutes);

  // ── Checkpoint Routes (with x402 support) ──
  app.post('/checkpoint', enableX402 ? x402Middleware : (req, res, next) => next(), checkpointHandler);

  // ── x402 Endpoint (payment verification) ──
  if (enableX402 && facilitator) {
    app.post('/x402/verify', x402Middleware, async (req: Request, res: Response) => {
      try {
        const { proof, request } = req.body as { proof: any; request: any };
        const accessToken = await facilitator.verifyPayment(proof, request);
        if (accessToken) {
          res.json({ success: true, accessToken });
        } else {
          res.status(402).json({ success: false, error: 'Payment verification failed' });
        }
      } catch (err: any) {
        console.error('[x402] error:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  // ── Stripe Webhook ──
  const webhookMiddleware = require('express').raw({ type: 'application/json' });  // <-- ERROR
  const stripeWebhookRoutes = require('./routes/stripe-webhook.js');  // <-- ERROR
  app.use('/stripe', webhookMiddleware, stripeWebhookRoutes);

  // ── Unified error handling ──
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
```

---

## Immediate Action

### Step 1: Fix `server-saas/src/app.ts`
```bash
# Fix syntax errors
cd packages/@keyspot/server-saas
sed -i "s/\(require('express')()\)n/app = express()/" src/app.ts"
sed -i "s/app.use(require('express')())/app.use(express.json({ limit: '10mb' }))/" src/app.ts"

# Import all routes correctly
# Edit the file to add proper imports
```

### Step 2: Create Missing Middleware
```bash
# Create basic usageTracker middleware
touch src/middleware/usageTracker.ts

# Add basic implementation to middleware/usageTracker.ts
```

### Step 3: Run Tests
```bash
# Try building server-core (should work)
cd packages/@keyspot/server-core
pnpm run build

# Try building server-saas (will have more errors to fix)
cd ../server-saas
pnpm run build
```

---

## Estimated Timeline

| Component | Fix Time | Testing |
|-----------|----------|---------|
| `app.ts` syntax | 15 minutes | 5 minutes |
| Missing middleware | 30 minutes | 10 minutes |
| x402 facilitator | 2-3 hours | 30 minutes |
| Agent identity | 1 hour | 15 minutes |
| Migration endpoints | 1 hour | 15 minutes |
| Stripe integration | 1 hour | 20 minutes |
| Tests | 3-4 hours | 2-3 hours |

**Total: 9-12 hours** of work to reach MVP (basic functionality)

---

## 🔧 Quick Fix Commands

### Fix Syntax in app.ts
```bash
cd packages/@keyspot/server-saas

# Backup original file
cp src/app.ts src/app.ts.backup

# Fix line 43
cat << 'EOF' >> temp.ts
sed 's/\(require('express')()\)n/app = express()/'/g temp.ts
sed 's/app.use(require('express')())/app.use(express.json({ limit: '10mb' }))/g' temp.ts
# (Continue fixing all issues...)

# Replace file
mv temp.ts src/app.ts
```

### Create Basic usageTracker
```bash
cd packages/@keyspot/server-saas
cat << 'EOF' > src/middleware/usageTracker.ts
import { Request, Response, NextFunction } from 'express';

export async function usageTracker(req: Request, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    console.log(`[Usage] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    next();
  });
}
EOF
```

### Build and Test
```bash
cd packages/@keyspot/server-core
pnpm run build
cd ../server-saas
pnpm run build
pnpm test
```

---

## 📋 Next Steps

After fixing `app.ts`:

1. **Complete x402 Facilitator** - Implement ERC-8004 integration
2. **Create Agent Identity Registry** - Support persistent agent identities
3. **Implement Migration Endpoints** - Agent passport import/export
4. **Add Stripe Integration** - Full subscription management
5. **Comprehensive Testing** - Unit tests for all SaaS features
6. **Docker Setup** - Container configurations for both modes

---

## TL;DR: What to Do Now

1. **Fix `server-saas/src/app.ts`** - Syntax errors blocking build
2. **Create basic `usageTracker.ts`** - Simple request tracking
3. **Run tests** - Build server-saas to confirm fixes
4. **Proceed with x402 implementation** - Complete payment facilitator

**The rest of the SaaS features can be implemented sequentially after the core server is functional.**

---

*Immediate focus: Fix syntax errors in app.ts and create missing middleware.*

## 💡 Quick Implementation Path

1. **Phase 1 (Today)**: Fix app.ts syntax, create basic middleware
2. **Phase 2 (Tomorrow)**: Complete x402 facilitator with ERC-8004
3. **Phase 3 (Day 3)**: Implement agent identity registry and migration endpoints
4. **Phase 4 (Day 4)**: Add Stripe integration and comprehensive tests

**Total: 4 days to reach MVP**
