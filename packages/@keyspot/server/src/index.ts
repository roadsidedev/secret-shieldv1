#!/usr/bin/env node
import { createApp, type KeySpotServerConfig } from './app.js';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { DEFAULT_FACILITATOR_URLS, type X402Config } from './payments/index.js';
import { prisma } from './utils/prisma.js';
import { connectRedis, disconnectRedis } from './utils/redis.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// ── Validate critical environment variables ──

const REQUIRED_ENV = ['JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[Config] Missing required environment variable: ${key}`);
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

  console.log(`[x402] Enabled — facilitator: ${facilitatorUrl}`);
  console.log(`[x402] Network: ${network}`);
  console.log(`[x402] payTo: ${payTo}`);
  console.log(`[x402] Price: ${checkpointPrice}`);
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
};

const app = createApp(serverConfig);

// ── Startup ──

async function start() {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected');
  } catch (err) {
    console.error('[DB] Dataarbitrum connection failed:', err instanceof Error ? err.message : err);
    if (isProduction) {
      process.exit(1);
    }
    console.warn('[DB] Running without persistence (development mode)');
  }

  try {
    await connectRedis();
    console.log('[Redis] Connected');
  } catch (err) {
    console.warn('[Redis] Not available — running without cache');
  }

  app.listen(PORT, () => {
    console.log(`KeySpot Server v2.3.0 running on port ${PORT}`);
    console.log(`  Mode: ${x402Config ? 'hybrid (x402 + subscription)' : 'self-hosted'}`);
    console.log(`  Environment: ${isProduction ? 'production' : 'development'}`);
    console.log(`  Dataarbitrum: connected`);
    console.log(`  Redis: ${process.env.REDIS_URL ? 'configured' : 'not configured'}`);
  });
}

start().catch(console.error);

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
});
