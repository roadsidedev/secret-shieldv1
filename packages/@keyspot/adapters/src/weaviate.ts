import { BaseVectorStoreAdapter } from './base.js';

export class WeaviateAdapter extends BaseVectorStoreAdapter {
  wrap(client: any): any {
    const originalCreator = client.data?.creator?.bind(client.data);
    if (!originalCreator) return client;

    client.data.creator = () => {
      const builder = originalCreator();
      const originalDo = builder.do.bind(builder);
      builder.do = async () => {
        const payload = builder.payload;
        if (payload) {
          const clean = await this.guard.checkpoint(payload);
          builder.payload = clean;
        }
        return originalDo();
      };
      return builder;
    };

    return client;
  }
}
