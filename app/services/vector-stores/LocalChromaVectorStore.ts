import type { IVectorStore, VectorStoreItem } from './IVectorStore';

export class LocalChromaVectorStore implements IVectorStore {
  private initialized: boolean = false;
  private client!: { getOrCreateCollection: (options: any) => Promise<any>; deleteCollection: (options: any) => Promise<any> };
  private collection!: { upsert: (options: any) => Promise<void>; get: (options: any) => Promise<any>; query: (options: any) => Promise<any>; delete: (options: any) => Promise<void>; count: () => Promise<number> };
  private collectionName: string = 'gimme_icon_collection';
  private persistDirectory: string = './chromadb_data';

  constructor(collectionName?: string, persistDirectory?: string) {
    if (collectionName) {
      this.collectionName = collectionName;
    }
    if (persistDirectory) {
      this.persistDirectory = persistDirectory;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 检查是否在浏览器环境中
      if (typeof window !== 'undefined') {
        throw new Error('LocalChromaVectorStore is not supported in browser environment. Please use MemoryVectorStore instead.');
      }

      // 动态导入ChromaDB（仅在Node.js环境可用）
      const { ChromaClient } = await import('chromadb');

      // 创建ChromaDB客户端，使用本地持久化存储
      this.client = new ChromaClient({
        path: this.persistDirectory
      });

      // 创建或获取集合
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description: 'Gimme Icon Vector Store Collection',
          createdAt: new Date().toISOString()
        }
      });

      this.initialized = true;
      console.log('LocalChromaVectorStore initialized successfully');
      console.log(`Collection name: ${this.collectionName}`);
      console.log(`Persist directory: ${this.persistDirectory}`);
    } catch (error) {
      console.error('Failed to initialize LocalChromaVectorStore:', error);
      throw error;
    }
  }

  async addVector(item: VectorStoreItem): Promise<void> {
    await this.collection.upsert({
      ids: [item.id],
      embeddings: [item.embedding],
      metadatas: item.metadata ? [item.metadata] : undefined
    });
  }

  async addVectors(items: VectorStoreItem[]): Promise<void> {
    const ids = items.map(item => item.id);
    const embeddings = items.map(item => item.embedding);
    const metadatas = items.map(item => item.metadata);

    await this.collection.upsert({
      ids,
      embeddings,
      metadatas: metadatas.some(m => m) ? metadatas : undefined
    });
  }

  async getVector(id: string): Promise<VectorStoreItem | undefined> {
    const result = await this.collection.get({
      ids: [id]
    });

    if (result.ids.length === 0) {
      return undefined;
    }

    return {
      id: result.ids[0],
      embedding: result.embeddings[0],
      metadata: result.metadatas?.[0] || undefined
    };
  }

  async getVectors(ids: string[]): Promise<VectorStoreItem[]> {
    const result = await this.collection.get({
      ids
    });

    return result.ids.map((id: string, index: number) => ({
      id,
      embedding: result.embeddings[index],
      metadata: result.metadatas?.[index] || undefined
    }));
  }

  async searchSimilarVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, string[] | string>
  ): Promise<{ id: string; score: number; metadata?: Record<string, string[] | string | number> }[]> {
    const result = await this.collection.query({
      queryEmbeddings: [queryVector],
      nResults: limit,
      where: filters
    });

    // 转换结果格式
    if (!result.ids[0] || result.ids[0].length === 0) {
      return [];
    }

    return result.ids[0].map((id: string, index: number) => ({
      id,
      score: result.distances[0][index],
      metadata: result.metadatas?.[0]?.[index] || undefined
    }));
  }

  async deleteVector(id: string): Promise<void> {
    await this.collection.delete({
      ids: [id]
    });
  }

  async clear(): Promise<void> {
    // 删除并重新创建集合
    await this.client.deleteCollection({
      name: this.collectionName
    });

    this.collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
      metadata: {
        description: 'Gimme Icon Vector Store Collection',
        createdAt: new Date().toISOString()
      }
    });
  }

  async hasVector(id: string): Promise<boolean> {
    const result = await this.collection.get({
      ids: [id]
    });

    return result.ids.length > 0;
  }

  async getVectorCount(): Promise<number> {
    const count = await this.collection.count();
    return count;
  }
}
