import { KeySpot } from '@roadsidelab/keyspot-core';
/**
 * Wraps a LangChain Runnable to scan outputs through KeySpot.
 * Compatible with LangChain JS v0.1+.
 *
 * Usage:
 *   const guardedChain = withKeySpot(chain, guard);
 *   const result = await guardedChain.invoke({ input: '...' });
 */
declare function withKeySpot<T extends {
    invoke: (...args: any[]) => Promise<any>;
}>(runnable: T, guard: KeySpot): T;
export { withKeySpot };
//# sourceMappingURL=langchain.d.ts.map