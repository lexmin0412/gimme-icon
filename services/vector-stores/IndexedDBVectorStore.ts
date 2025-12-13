import type { IVectorStore, VectorStoreItem } from './IVectorStore';
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

  async addVector(item: VectorStoreItem): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 获取所有现有向量
      const vectors = await this.getAllVectors();
      // 检查是否已存在相同id的向量
      const existingIndex = vectors.findIndex(v => v.id === item.id);
      if (existingIndex >= 0) {
        // 如果存在，更新现有向量
        vectors[existingIndex] = item;
      } else {
        // 如果不存在，添加新向量
        vectors.push(item);
      }
      // 保存回IndexedDB
      await localforage.setItem(this.storeName, vectors);
    } catch (error) {
      console.error('Failed to add vector:', error);
      throw error;
    }
  }

  async addVectors(items: VectorStoreItem[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 获取所有现有向量
      const vectors = await this.getAllVectors();
      // 创建一个id到索引的映射，用于快速查找
      const idIndexMap = new Map(vectors.map((vector, index) => [vector.id, index]));
      
      // 批量添加新向量
      items.forEach(item => {
        const existingIndex = idIndexMap.get(item.id);
        if (existingIndex !== undefined) {
          // 如果存在，更新现有向量
          vectors[existingIndex] = item;
        } else {
          // 如果不存在，添加新向量并更新映射
          vectors.push(item);
          idIndexMap.set(item.id, vectors.length - 1);
        }
      });
      // 保存回IndexedDB
      await localforage.setItem(this.storeName, vectors);
    } catch (error) {
      console.error('Failed to add vectors:', error);
      throw error;
    }
  }

  async getVector(id: string): Promise<VectorStoreItem | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const vectors = await this.getAllVectors();
      return vectors.find(vector => vector.id === id);
    } catch (error) {
      console.error('Failed to get vector:', error);
      return undefined;
    }
  }

  async getVectors(ids: string[]): Promise<VectorStoreItem[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const vectors = await this.getAllVectors();
      const idSet = new Set(ids);
      return vectors.filter(vector => idSet.has(vector.id));
    } catch (error) {
      console.error('Failed to get vectors:', error);
      return [];
    }
  }

  async searchSimilarVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, string[] | string>
  ): Promise<{ id: string; score: number; metadata?: Record<string, string[] | string | number> }[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 计算余弦相似度
      const cosineSimilarity = (a: number[], b: number[]): number => {
        const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
        return dotProduct / (magnitudeA * magnitudeB);
      };

      // 获取所有向量
      const vectors = await this.getAllVectors();
      const vectorArray = vectors;

      // 过滤向量（如果有过滤条件）
      const filteredVectors = vectorArray.filter(vector => {
        if (!filters) return true;
        
        // 检查所有过滤条件
        for (const [key, value] of Object.entries(filters)) {
          if (vector.metadata?.[key] !== value) {
            return false;
          }
        }
        
        return true;
      });

      // 计算相似度并排序
      const results = filteredVectors
        .map(vector => ({
          id: vector.id,
          score: cosineSimilarity(queryVector, vector.embedding),
          metadata: vector.metadata
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Failed to search similar vectors:', error);
      return [];
    }
  }

  async deleteVector(id: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const vectors = await this.getAllVectors();
      const updatedVectors = vectors.filter(vector => vector.id !== id);
      await localforage.setItem(this.storeName, updatedVectors);
    } catch (error) {
      console.error('Failed to delete vector:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await localforage.setItem(this.storeName, []);
    } catch (error) {
      console.error('Failed to clear vectors:', error);
      throw error;
    }
  }

  async hasVector(id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const vectors = await this.getAllVectors();
      return vectors.some(vector => vector.id === id);
    } catch (error) {
      console.error('Failed to check vector existence:', error);
      return false;
    }
  }

  async getVectorCount(): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const vectors = await this.getAllVectors();
      return vectors.length;
    } catch (error) {
      console.error('Failed to get vector count:', error);
      return 0;
    }
  }

  async updateVector(
    id: string,
    newEmbedding: number[],
    metadata?: Record<string, string[] | string | number>
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const vectors = await this.getAllVectors();
      const existingIndex = vectors.findIndex(vector => vector.id === id);
      
      if (existingIndex === -1) {
        throw new Error(`Vector with id ${id} not found`);
      }

      // 更新向量，保留原有metadata（如果没有提供新的metadata）
      const updatedVector: VectorStoreItem = {
        id,
        embedding: newEmbedding,
        metadata: metadata || vectors[existingIndex].metadata
      };

      vectors[existingIndex] = updatedVector;
      await localforage.setItem(this.storeName, vectors);
    } catch (error) {
      console.error('Failed to update vector:', error);
      throw error;
    }
  }

  /**
   * 辅助方法：获取所有向量
   */
  private async getAllVectors(): Promise<VectorStoreItem[]> {
    try {
      const data = await localforage.getItem(this.storeName);
      
      // 处理旧的Map格式数据 [string, VectorStoreItem][]
      if (data && Array.isArray(data) && data.length > 0) {
        // 检查是否是旧的Map格式
        if (Array.isArray(data[0]) && data[0].length === 2 && typeof data[0][0] === 'string') {
          console.log('Converting old Map format data to new object array format');
          return (data as [string, VectorStoreItem][]).map(([id, item]) => item);
        }
      }
      
      return (data as VectorStoreItem[]) || [];
    } catch (error) {
      console.error('Failed to get all vectors:', error);
      return [];
    }
  }
}