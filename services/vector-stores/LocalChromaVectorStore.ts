import type { IVectorStore, VectorStoreItem, SearchResult } from './IVectorStore';

export class LocalChromaVectorStore implements IVectorStore {
  private initialized: boolean = false;
  private client!: any;
  private collection!: any;
  private collectionName!: string;
  private persistDirectory: string = './chromadb_data';

  constructor(collectionName?: string, persistDirectory?: string) {
    this.collectionName = collectionName ?? process.env.CHROMA_COLLECTION!;
    if (!this.collectionName) {
      throw new Error('Missing CHROMA_COLLECTION in environment');
    }
    if (persistDirectory) {
      this.persistDirectory = persistDirectory;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (typeof window !== 'undefined') {
        throw new Error('LocalChromaVectorStore is not supported in browser environment.');
      }

      const { ChromaClient } = await import('chromadb');
      this.client = new ChromaClient({
        path: this.persistDirectory
      });

      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description: 'Gimme Icon Vector Store Collection',
          createdAt: new Date().toISOString()
        }
      });

      this.initialized = true;
      console.log('LocalChromaVectorStore initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LocalChromaVectorStore:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
      if (!this.initialized) await this.initialize();
  }

  async addVector(item: VectorStoreItem): Promise<void> {
    await this.ensureInitialized();
    await this.batchAddVectors([item]);
  }

  async batchAddVectors(items: VectorStoreItem[]): Promise<void> {
    await this.ensureInitialized();
    const ids = items.map(item => item.id);
    const embeddings = items.map(item => item.embedding);
    const metadatas = items.map(item => item.metadata);

    await this.collection.upsert({
      ids,
      embeddings,
      metadatas: metadatas.some(m => m) ? metadatas : undefined
    });
  }

  async updateVector(id: string, vector: number[], metadata?: Record<string, any>): Promise<void> {
      await this.batchUpdateVectors([{ id, vector, metadata }]);
  }

  async batchUpdateVectors(items: { id: string; vector: number[]; metadata?: Record<string, any> }[]): Promise<void> {
      // Upsert handles updates
      await this.ensureInitialized();
      const vectorItems = items.map(item => ({
        id: item.id,
        embedding: item.vector,
        metadata: item.metadata
      }));
      await this.batchAddVectors(vectorItems);
  }

  async deleteVector(id: string): Promise<void> {
      await this.batchDeleteVectors([id]);
  }

  async batchDeleteVectors(ids: string[]): Promise<void> {
      await this.ensureInitialized();
      await this.collection.delete({ ids });
  }

  async getVector(id: string): Promise<VectorStoreItem | undefined> {
    await this.ensureInitialized();
    const result = await this.collection.get({ ids: [id], include: ['embeddings', 'metadatas'] });
    if (result.ids.length === 0) return undefined;
    return {
      id: result.ids[0],
      embedding: result.embeddings[0],
      metadata: result.metadatas?.[0] || undefined
    };
  }

  async getVectors(ids: string[]): Promise<VectorStoreItem[]> {
    await this.ensureInitialized();
    const result = await this.collection.get({ ids, include: ['embeddings', 'metadatas'] });
    return result.ids.map((id: string, index: number) => ({
      id,
      embedding: result.embeddings[index],
      metadata: result.metadatas?.[index] || undefined
    }));
  }

  async searchVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, any>
  ): Promise<SearchResult[]> {
      await this.ensureInitialized();
      const result = await this.collection.query({
          queryEmbeddings: [queryVector],
          nResults: limit,
          where: filters // Chroma filter format might be different, but assuming it matches for now
      });
      
      const ids = result.ids[0];
      const distances = result.distances?.[0]; 
      const metadatas = result.metadatas?.[0];

      return ids.map((id: string, index: number) => ({
          id,
          score: distances ? 1 - distances[index] : 0, 
          metadata: metadatas?.[index] || undefined
      }));
  }

  async hasVector(id: string): Promise<boolean> {
      const v = await this.getVector(id);
      return !!v;
  }

  async getVectorCount(): Promise<number> {
      await this.ensureInitialized();
      return await this.collection.count();
  }

  async clear(): Promise<void> {
      await this.ensureInitialized();
      await this.client.deleteCollection({ name: this.collectionName });
      this.collection = await this.client.getOrCreateCollection({ name: this.collectionName });
  }
}
