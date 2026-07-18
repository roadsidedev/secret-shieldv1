import { KeySpot } from '@roadsidelab/keyspot-core';
/**
 * Represents a Hermes agent interface.
 * Hermes agents process tasks via `run()` or `execute()` with an input object.
 */
export interface HermesAgent {
    run: (input: Record<string, unknown>) => Promise<unknown>;
}
/**
 * Wraps a Hermes agent so all outputs are scanned through KeySpot.
 *
 * Usage:
 *   const guarded = wrapHermesAgent(agent, guard);
 *   const result = await guarded.run({ task: "audit repo", path: "./src" });
 */
export declare function wrapHermesAgent<T extends HermesAgent>(agent: T, guard: KeySpot): T;
//# sourceMappingURL=hermes.d.ts.map