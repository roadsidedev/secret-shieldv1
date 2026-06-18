import { BaseVectorStoreAdapter } from './base.js';
import type { Collection } from 'chromadb';

export class ChromaAdapter extends BaseVectorStoreAdapter {
  wrap(collection: Collection): Collection {
    const originalAdd = collection.add.bind(collection);
    collection.add = async (params: Parameters<Collection['add']>[0]) => {
      if (params.documents) {
        const sanitized = await this.sanitizeDocuments(params.documents as any[]);
        params.documents = sanitized as any;
      }
      if (params.metadatas) {
        const cleaned = await this.sanitizeDocuments(params.metadatas as any[]);
        params.metadatas = cleaned as any;
      }
      return originalAdd(params);
    };
    return collection;
  }
}
