import { KeySpot } from '@roadsidelab/keyspot-core';
/**
 * Represents an OpenClaw agent interface.
 * OpenClaw agents execute tasks via a `run()` method that accepts a goal and returns output.
 */
export interface OpenClawAgent {
    run: (goal: string, context?: Record<string, unknown>) => Promise<unknown>;
}
/**
 * Wraps an OpenClaw agent so all outputs are scanned through KeySpot.
 *
 * Usage:
 *   const guarded = wrapOpenClawAgent(agent, guard);
 *   const result = await guarded.run("deploy the app", { branch: "main" });
 */
export declare function wrapOpenClawAgent<T extends OpenClawAgent>(agent: T, guard: KeySpot): T;
//# sourceMappingURL=openclaw.d.ts.map