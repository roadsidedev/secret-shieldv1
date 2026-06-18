import { BaseVectorStoreAdapter } from './base.js';

export class LanceDBAdapter extends BaseVectorStoreAdapter {
  wrap(table: any): any {
    const originalAdd = table.add.bind(table);
    table.add = async (records: any[]) => {
      const sanitized = await this.sanitizeDocuments(records);
      return originalAdd(sanitized);
    };
    return table;
  }
}
