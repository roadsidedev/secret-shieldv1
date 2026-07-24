import { BaseVectorStoreAdapter } from './base.js';
import type { Index } from '@pinecone-database/pinecone';
export declare class PineconeAdapter extends BaseVectorStoreAdapter {
    wrap(index: Index): Index;
}
//# sourceMappingURL=pinecone.d.ts.map