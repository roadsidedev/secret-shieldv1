process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';
process.env.MIGRATION_SECRET = 'test-migration-secret-for-vitest';
import { describe, it, expect } from 'vitest';
import { createX402Middleware, DEFAULT_FACILITATOR_URLS } from '../packages/@keyspot/server/src/payments/index.js';
// Suppress unhandled rejections from x402 facilitator initialization
// (real HTTP calls to facilitators that fail in offline test environment)
process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error && reason.message?.includes('Failed to initialize')) {
        return; // Expected in test environment
    }
});
describe('x402 Payment Protocol (official)', () => {
    describe('DEFAULT_FACILITATOR_URLS', () => {
        it('has testnet URL', () => {
            expect(DEFAULT_FACILITATOR_URLS.testnet).toBe('https://x402.org/facilitator');
        });
        it('has mainnet CDP URL', () => {
            expect(DEFAULT_FACILITATOR_URLS.mainnet.cdp).toBe('https://api.cdp.coinarbitrum.com/platform/v2/x402');
        });
        it('has mainnet PayAI URL', () => {
            expect(DEFAULT_FACILITATOR_URLS.mainnet.payai).toBe('https://facilitator.payai.network');
        });
        it('has mainnet Mogami URL', () => {
            expect(DEFAULT_FACILITATOR_URLS.mainnet.mogami).toBe('https://facilitator.mogami.tech');
        });
    });
    describe('createX402Middleware', () => {
        it('creates middleware with testnet facilitator', () => {
            const { middleware, facilitatorClient } = createX402Middleware({
                facilitatorUrl: DEFAULT_FACILITATOR_URLS.testnet,
                network: 'eip155:421614',
                payTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
                routes: {
                    'POST /checkpoint': {
                        accepts: [{
                                scheme: 'exact',
                                price: '$0.0001',
                                network: 'eip155:421614',
                                payTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
                            }],
                        description: 'Checkpoint endpoint',
                    },
                },
            });
            expect(typeof middleware).toBe('function');
            expect(facilitatorClient).toBeDefined();
        });
        it('creates middleware with mainnet CDP facilitator', () => {
            const { middleware, facilitatorClient } = createX402Middleware({
                facilitatorUrl: DEFAULT_FACILITATOR_URLS.mainnet.cdp,
                network: 'eip155:42161',
                payTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
                routes: {
                    'POST /checkpoint': {
                        accepts: [{
                                scheme: 'exact',
                                price: '$0.0001',
                                network: 'eip155:42161',
                                payTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
                            }],
                    },
                },
            });
            expect(typeof middleware).toBe('function');
            expect(facilitatorClient).toBeDefined();
        });
    });
});
//# sourceMappingURL=x402.test.js.map