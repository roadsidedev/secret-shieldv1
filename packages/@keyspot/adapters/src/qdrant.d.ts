import { BaseVectorStoreAdapter } from './base.js';
import type { QdrantClient } from '@qdrant/js-client-rest';
export declare class QdrantAdapter extends BaseVectorStoreAdapter {
    wrap(client: QdrantClient): QdrantClient;
}
//# sourceMappingURL=qdrant.d.ts.map