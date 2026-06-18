import { BaseVectorStoreAdapter } from './base.js';

export class MilvusAdapter extends BaseVectorStoreAdapter {
  wrap(client: any): any {
    const originalInsert = client.insert.bind(client);
    client.insert = async (params: { collection_name: string; data: any[] }) => {
      if (params.data) {
        params.data = await this.sanitizeDocuments(params.data);
      }
      return originalInsert(params);
    };
    return client;
  }
}
