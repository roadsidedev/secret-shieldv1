import { KeySpot, type KeySpotConfig } from '@roadsidelab/keyspot-core';
export type { KeySpotConfig };
export interface GuardedAgent<T> {
    agent: T;
    guard: KeySpot;
}
export declare function guardAgent<T>(agent: T, config?: KeySpotConfig): GuardedAgent<T>;
export declare function guardState<T>(state: T, config?: KeySpotConfig): Promise<T>;
export { KeySpot } from '@roadsidelab/keyspot-core';
//# sourceMappingURL=index.d.ts.map