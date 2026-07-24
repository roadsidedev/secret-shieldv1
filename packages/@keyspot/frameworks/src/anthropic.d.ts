import { KeySpot } from '@roadsidelab/keyspot-core';
/**
 * Creates an Anthropic SDK client wrapper that scans responses.
 *
 * Usage:
 *   const guarded = wrapAnthropic(anthropic, guard);
 *   const msg = await guarded.messages.create({ ... });
 */
export declare function wrapAnthropic<T extends {
    messages: {
        create: (params: any) => Promise<any>;
    };
}>(client: T, guard: KeySpot): T;
//# sourceMappingURL=anthropic.d.ts.map