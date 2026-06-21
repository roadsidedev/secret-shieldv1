#!/usr/bin/env node
import { createApp, type KeySpotServerConfig } from './app.js';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { logger } from '@roadsidelab/keyspot-core/logger';
import { DEFAULT_FACILITATOR_URLS, type X402Config } from './payments/index.js';
import { prisma } from './utils/prisma.js';
import { connectRedis, disconnectRedis } from './utils/redis.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// ── Validate critical environment variables ──

const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
if (process.env.ENABLE_X402 === 'true') {
  REQUIRED_ENV.push('PAY_TO_ADDRESS');
  if (process.env.X402_FACILITATOR_PROVIDER) {
    const validProviders = Object.keys(DEFAULT_FACILITATOR_URLS.mainnet);
    if (!validProviders.includes(process.env.X402_FACILITATOR_PROVIDER)) {
      console.error(`[Config] Invalid X402_FACILITATOR_PROVIDER "${process.env.X402_FACILITATOR_PROVIDER}". Valid: ${validProviders.join(', ')}`);
      process.exit(1);
    }
  }
}
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── Resolve facilitator URL ──

function resolveFacilitatorUrl(): string {
  const explicit = process.env.X402_FACILITATOR_URL;
  if (explicit) return explicit;

  if (!isProduction) return DEFAULT_FACILITATOR_URLS.testnet;

  // Production: use configured provider or default to CDP
  const provider = (process.env.X402_FACILITATOR_PROVIDER || 'cdp') as keyof typeof DEFAULT_FACILITATOR_URLS.mainnet;
  return DEFAULT_FACILITATOR_URLS.mainnet[provider] || DEFAULT_FACILITATOR_URLS.mainnet.cdp;
}

// ── Resolve network (CAIP-2 format) ──

function resolveNetwork(): string {
  const network = process.env.X402_NETWORK;
  if (network) return network;

  if (!isProduction) return 'eip155:421614'; // Arbitrum One Sepolia
  return 'eip155:42161'; // Arbitrum One Mainnet
}

// ── Build x402 config (if enabled) ──

const enableX402 = process.env.ENABLE_X402 === 'true';
const payTo = process.env.PAY_TO_ADDRESS;
const checkpointPrice = process.env.X402_PRICE || '$0.0001';

let x402Config: X402Config | undefined;

if (enableX402 && payTo) {
  const facilitatorUrl = resolveFacilitatorUrl();
  const network = resolveNetwork();

  x402Config = {
    facilitatorUrl,
    network,
    payTo,
    routes: {
      'POST /checkpoint': {
        accepts: [{
          scheme: 'exact',
          price: checkpointPrice,
          network,
          payTo,
        }],
        description: 'KeySpot checkpoint — scan agent state for secrets and injection',
        mimeType: 'application/json',
      },
    },
  };

  logger.info(`x402 enabled — facilitator: ${facilitatorUrl}`);
  logger.info(`x402 network: ${network}`);
  logger.info(`x402 payTo: ${payTo}`);
  logger.info(`x402 price: ${checkpointPrice}`);
}

// ── Create guard and app ──

const guard = new KeySpot({
  taintEnabled: true,
  promptShield: { enabled: true },
});

const serverConfig: KeySpotServerConfig = {
  guard,
  x402: x402Config,
  trustedProxies: process.env.TRUSTED_PROXIES?.split(',').filter(Boolean) || ['loopback'],
  version,
};

const app = createApp(serverConfig);

// ── Startup ──

async function start() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected');
  } catch (err) {
    logger.error('Database connection failed: ' + (err instanceof Error ? err.message : String(err)));
    if (isProduction) {
      process.exit(1);
    }
    logger.warn('Running without database (development mode)');
  }

  try {
    await connectRedis();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn('Redis not available — running without cache');
  }

  const pkg = await import('../package.json', { with: { type: 'json' } }).catch(() => ({ default: { version: '0.0.0' } }));
  const version = (pkg as any).default?.version ?? '0.0.0';

  app.listen(PORT, () => {
    logger.info(`KeySpot Server v${version} running on port ${PORT}`, { mode: x402Config ? 'hybrid' : 'self-hosted', env: isProduction ? 'production' : 'development' });
    logger.info(`TLS: HTTPS must be terminated upstream (reverse proxy)`);
    if (!x402Config) {
      logger.info('x402: Payment enforcement DISABLED (self-hosted mode)');
    }
  });
}

start().catch(console.error);

process.on('SIGTERM', async () => {
  logger.info('Shutting down (SIGTERM)');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down (SIGINT)');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});
