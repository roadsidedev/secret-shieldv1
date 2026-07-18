import type { KeySpot } from './index.js';
export interface VectorStoreAdapter {
    wrap(store: any): any;
}
export declare abstract class BaseVectorStoreAdapter implements VectorStoreAdapter {
    protected guard: KeySpot;
    constructor(guard: KeySpot);
    abstract wrap(store: any): any;
    protected sanitizeDocuments<T>(documents: T[]): Promise<T[]>;
}
//# sourceMappingURL=adapters.d.ts.map