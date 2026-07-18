import { describe, it, expect, vi } from 'vitest';
import { KeySpot } from '@roadsidelab/keyspot-sdk';
import { ChromaAdapter, PineconeAdapter, QdrantAdapter, WeaviateAdapter, LanceDBAdapter, MilvusAdapter, BaseVectorStoreAdapter } from '@roadsidelab/keyspot-sdk/adapters';
describe('Vector Store Adapters', () => {
    describe('ChromaAdapter', () => {
        it('intercepts collection.add and sanitizes documents', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const adapter = new ChromaAdapter(guard);
            const addMock = vi.fn().mockResolvedValue({});
            const collection = {
                add: addMock
            };
            const wrapped = adapter.wrap(collection);
            await wrapped.add({ documents: ['secret is sk-123456789012345678901234567890123456789012345678'] });
            expect(addMock).toHaveBeenCalledTimes(1);
            const callArg = addMock.mock.calls[0][0];
            expect(callArg.documents[0]).toMatch(/^vault:v1:/);
        });
    });
    describe('PineconeAdapter', () => {
        it('intercepts index.upsert and sanitizes records', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const adapter = new PineconeAdapter(guard);
            const upsertMock = vi.fn().mockResolvedValue({});
            const index = {
                upsert: upsertMock
            };
            const wrapped = adapter.wrap(index);
            await wrapped.upsert([{ id: '1', values: [0.1], metadata: { text: 'sk-123456789012345678901234567890123456789012345678' } }]);
            expect(upsertMock).toHaveBeenCalledTimes(1);
            const sanitized = upsertMock.mock.calls[0][0];
            expect(sanitized[0].metadata.text).toMatch(/^vault:v1:/);
        });
    });
    describe('QdrantAdapter', () => {
        it('intercepts client.upsert and sanitizes points', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const adapter = new QdrantAdapter(guard);
            const upsertMock = vi.fn().mockResolvedValue({});
            const client = {
                upsert: upsertMock
            };
            const wrapped = adapter.wrap(client);
            await wrapped.upsert('my_collection', { points: [{ id: 1, payload: { text: 'sk-123456789012345678901234567890123456789012345678' } }] });
            expect(upsertMock).toHaveBeenCalledTimes(1);
            const sanitized = upsertMock.mock.calls[0][1];
            expect(sanitized.points[0].payload.text).toMatch(/^vault:v1:/);
        });
    });
    describe('WeaviateAdapter', () => {
        it('intercepts data.creator and sanitizes payload', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const adapter = new WeaviateAdapter(guard);
            const doMock = vi.fn().mockResolvedValue({});
            const builder = { payload: { text: 'sk-123456789012345678901234567890123456789012345678' }, do: doMock };
            const creatorMock = vi.fn().mockReturnValue(builder);
            const client = { data: { creator: creatorMock } };
            const wrapped = adapter.wrap(client);
            const result = await wrapped.data.creator().do();
            expect(doMock).toHaveBeenCalledTimes(1);
            expect(builder.payload.text).toMatch(/^vault:v1:/);
        });
    });
    describe('LanceDBAdapter', () => {
        it('intercepts table.add and sanitizes records', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const adapter = new LanceDBAdapter(guard);
            const addMock = vi.fn().mockResolvedValue({});
            const table = { add: addMock };
            const wrapped = adapter.wrap(table);
            await wrapped.add([{ text: 'sk-123456789012345678901234567890123456789012345678' }]);
            expect(addMock).toHaveBeenCalledTimes(1);
            const sanitized = addMock.mock.calls[0][0];
            expect(sanitized[0].text).toMatch(/^vault:v1:/);
        });
    });
    describe('MilvusAdapter', () => {
        it('intercepts client.insert and sanitizes data', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const adapter = new MilvusAdapter(guard);
            const insertMock = vi.fn().mockResolvedValue({});
            const client = { insert: insertMock };
            const wrapped = adapter.wrap(client);
            await wrapped.insert({ collection_name: 'test', data: [{ text: 'sk-123456789012345678901234567890123456789012345678' }] });
            expect(insertMock).toHaveBeenCalledTimes(1);
            const sanitized = insertMock.mock.calls[0][0];
            expect(sanitized.data[0].text).toMatch(/^vault:v1:/);
        });
    });
    describe('BaseVectorStoreAdapter', () => {
        it('sanitizes documents through the guard', async () => {
            const guard = new KeySpot({ taintEnabled: true });
            const adapter = new (class extends BaseVectorStoreAdapter {
                wrap(store) { return store; }
            })(guard);
            const docs = await adapter.sanitizeDocuments(['sk-123456789012345678901234567890123456789012345678']);
            expect(docs[0]).toMatch(/^vault:v1:/);
        });
        it('handles clean documents without modification', async () => {
            const guard = new KeySpot();
            const adapter = new (class extends BaseVectorStoreAdapter {
                wrap(store) { return store; }
            })(guard);
            const docs = await adapter.sanitizeDocuments(['clean text', 'more clean text']);
            expect(docs[0]).toBe('clean text');
            expect(docs[1]).toBe('more clean text');
        });
    });
});
//# sourceMappingURL=adapters.test.js.map