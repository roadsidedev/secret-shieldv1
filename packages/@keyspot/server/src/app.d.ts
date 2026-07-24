import { Express } from 'express';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { type X402Config } from './payments/index.js';
export interface KeySpotServerConfig {
    guard?: KeySpot;
    x402?: X402Config;
    trustedProxies?: string[];
}
export declare function createApp(config?: KeySpotServerConfig): Express;
//# sourceMappingURL=app.d.ts.map