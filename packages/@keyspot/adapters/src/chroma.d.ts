import { BaseVectorStoreAdapter } from './base.js';
import type { Collection } from 'chromadb';
export declare class ChromaAdapter extends BaseVectorStoreAdapter {
    wrap(collection: Collection): Collection;
}
//# sourceMappingURL=chroma.d.ts.map