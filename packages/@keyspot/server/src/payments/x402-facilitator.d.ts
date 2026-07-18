import { x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
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
export declare function createX402Middleware(config: X402Config): {
    middleware: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
    server: x402ResourceServer;
    facilitatorClient: HTTPFacilitatorClient;
};
export declare const DEFAULT_FACILITATOR_URLS: {
    readonly testnet: "https://x402.org/facilitator";
    readonly mainnet: {
        readonly cdp: "https://api.cdp.coinarbitrum.com/platform/v2/x402";
        readonly payai: "https://facilitator.payai.network";
        readonly mogami: "https://facilitator.mogami.tech";
    };
};
//# sourceMappingURL=x402-facilitator.d.ts.map