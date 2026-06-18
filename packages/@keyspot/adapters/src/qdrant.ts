import { BaseVectorStoreAdapter } from './base.js';
import type { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantAdapter extends BaseVectorStoreAdapter {
  wrap(client: QdrantClient): QdrantClient {
    const originalUpsert = client.upsert.bind(client);
    client.upsert = async (collectionName: string, params: any) => {
      if (params?.points) {
        params.points = await this.sanitizeDocuments(params.points);
      }
      return originalUpsert(collectionName, params);
    };
    return client;
  }
}
