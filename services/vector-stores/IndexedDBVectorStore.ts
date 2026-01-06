import type { IVectorStore, VectorStoreItem, SearchResult } from './IVectorStore';
import localforage from 'localforage';

// 配置localforage
localforage.config({
  name: 'gimme-icons',
  storeName: 'vector-store',
  description: '存储图标向量数据的IndexedDB数据库'
});

export class IndexedDBVectorStore implements IVectorStore {
  private initialized: boolean = false;
  private storeName: string;

  constructor(storeName: string = 'default-vectors') {
    this.storeName = storeName;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // 检查localforage是否可用（浏览器环境）
    if (typeof window === 'undefined') {
      console.warn('IndexedDBVectorStore is not supported in non-browser environment');
      return;
    }
    
    this.initialized = true;
    console.log('IndexedDBVectorStore initialized successfully');
  }

  private async getAllVectors(): Promise<VectorStoreItem[]> {
    if (!this.initialized) await this.initialize();
    try {
      const vectors = await localforage.getItem<VectorStoreItem[]>(this.storeName);
      return vectors || [];
    } catch (error) {
      console.error('Failed to get all vectors:', error);
      return [];
    }
  }

  private async saveAllVectors(vectors: VectorStoreItem[]): Promise<void> {
    if (!this.initialized) await this.initialize();
    try {
      await localforage.setItem(this.storeName, vectors);
    } catch (error) {
      console.error('Failed to save vectors:', error);
      throw error;
    }
  }

  async searchVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, unknown>
  ): Promise<SearchResult[]> {
    const vectors = await this.getAllVectors();
    
    // 1. Filter
    const filteredVectors = vectors.filter(vector => {
      if (!filters) return true;
      for (const [key, value] of Object.entries(filters)) {
        if (!vector.metadata) return false;
        const metadataValue = vector.metadata[key];
        
        if (Array.isArray(value)) {
          if (Array.isArray(metadataValue)) {
            const metaArray = metadataValue as unknown[];
            const filterArray = value as unknown[];
            const hasIntersection = metaArray.some(mv => filterArray.includes(mv));
            if (!hasIntersection) return false;
          } else {
            if (!value.includes(metadataValue)) return false;
          }
        } else {
          if (metadataValue !== value) return false;
        }
      }
      return true;
    });

    // 2. Calculate Similarity & Sort
    const results: SearchResult[] = filteredVectors.map(vector => {
      const score = this.calculateCosineSimilarity(queryVector, vector.embedding);
      return {
        id: vector.id,
        score,
        metadata: vector.metadata
      };
    });

    return results
      .filter(r => r.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async getVector(id: string): Promise<VectorStoreItem | undefined> {
    const vectors = await this.getAllVectors();
    return vectors.find(v => v.id === id);
  }

  async getVectors(ids: string[]): Promise<VectorStoreItem[]> {
    const vectors = await this.getAllVectors();
    return vectors.filter(v => ids.includes(v.id));
  }

  async addVector(item: VectorStoreItem): Promise<void> {
    await this.batchAddVectors([item]);
  }

  async batchAddVectors(items: VectorStoreItem[]): Promise<void> {
    const vectors = await this.getAllVectors();
    const idMap = new Map(vectors.map((v, i) => [v.id, i]));

    for (const item of items) {
      if (idMap.has(item.id)) {
        vectors[idMap.get(item.id)!] = item;
      } else {
        vectors.push(item);
        idMap.set(item.id, vectors.length - 1);
      }
    }
    await this.saveAllVectors(vectors);
  }

  async updateVector(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void> {
    await this.batchUpdateVectors([{ id, vector, metadata }]);
  }

  async batchUpdateVectors(items: { id: string; vector: number[]; metadata?: Record<string, unknown> }[]): Promise<void> {
    const vectors = await this.getAllVectors();
    const idMap = new Map(vectors.map((v, i) => [v.id, i]));
    let changed = false;

    for (const item of items) {
      const index = idMap.get(item.id);
      if (index !== undefined) {
        vectors[index] = {
          ...vectors[index],
          embedding: item.vector,
          metadata: item.metadata ? { ...vectors[index].metadata, ...item.metadata } : vectors[index].metadata
        };
        changed = true;
      }
    }

    if (changed) {
      await this.saveAllVectors(vectors);
    }
  }

  async deleteVector(id: string): Promise<void> {
    await this.batchDeleteVectors([id]);
  }

  async batchDeleteVectors(ids: string[]): Promise<void> {
    const vectors = await this.getAllVectors();
    const initialLength = vectors.length;
    const newVectors = vectors.filter(v => !ids.includes(v.id));
    
    if (newVectors.length !== initialLength) {
      await this.saveAllVectors(newVectors);
    }
  }

  async hasVector(id: string): Promise<boolean> {
    const vectors = await this.getAllVectors();
    return vectors.some(v => v.id === id);
  }

  async getVectorCount(): Promise<number> {
    const vectors = await this.getAllVectors();
    return vectors.length;
  }

  async clear(): Promise<void> {
    await this.saveAllVectors([]);
  }
}
