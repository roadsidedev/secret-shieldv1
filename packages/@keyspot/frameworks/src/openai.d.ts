import { KeySpot } from '@roadsidelab/keyspot-core';
/**
 * Wraps an OpenAI SDK client to scan chat completions through KeySpot.
 *
 * Usage:
 *   const guarded = wrapOpenAI(openai, guard);
 *   const completion = await guarded.chat.completions.create({ ... });
 */
export declare function wrapOpenAI<T extends {
    chat: {
        completions: {
            create: (params: any) => Promise<any>;
        };
    };
}>(client: T, guard: KeySpot): T;
//# sourceMappingURL=openai.d.ts.map