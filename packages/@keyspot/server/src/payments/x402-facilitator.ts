import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';

export interface X402Config {
  facilitatorUrl: string;
  network: string;
  payTo: string;
  routes: Record<string, {
    accepts: Array<{
      scheme: string;
      price: string;
      network: string;
      payTo: string;
    }>;
    description?: string;
    mimeType?: string;
  }>;
}

export function createX402Middleware(config: X402Config) {
  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl,
  });

  const server = new x402ResourceServer(facilitatorClient);

  // Register EVM scheme for all EVM networks
  server.register('eip155:*', new ExactEvmScheme());

  const middleware = paymentMiddleware(
    config.routes as any,
    server,
    undefined,
    undefined,
    false, // lazy init — avoids unhandled rejection crash on startup
  );

  return { middleware, server, facilitatorClient };
}

export const DEFAULT_FACILITATOR_URLS = {
  testnet: 'https://facilitator.payai.network',
  mainnet: {
    cdp: 'https://api.cdp.coinarbitrum.com/platform/v2/x402',
    payai: 'https://facilitator.payai.network',
    mogami: 'https://facilitator.mogami.tech',
  },
} as const;
