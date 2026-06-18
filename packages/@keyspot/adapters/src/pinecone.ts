import { BaseVectorStoreAdapter } from './base.js';
import type { Index } from '@pinecone-database/pinecone';

export class PineconeAdapter extends BaseVectorStoreAdapter {
  wrap(index: Index): Index {
    const originalUpsert = index.upsert.bind(index);
    index.upsert = async (records: any[]) => {
      const sanitized = await this.sanitizeDocuments(records);
      return originalUpsert(sanitized);
    };
    return index;
  }
}
