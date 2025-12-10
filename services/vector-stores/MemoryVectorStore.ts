import type { IVectorStore, VectorStoreItem } from './IVectorStore';

export class MemoryVectorStore implements IVectorStore {
  private initialized: boolean = false;
  private vectors: Map<string, VectorStoreItem> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    console.log('MemoryVectorStore initialized successfully');
  }

  async addVector(item: VectorStoreItem): Promise<void> {
    this.vectors.set(item.id, item);
  }

  async addVectors(items: VectorStoreItem[]): Promise<void> {
    for (const item of items) {
      await this.addVector(item);
    }
  }

  async getVector(id: string): Promise<VectorStoreItem | undefined> {
    return this.vectors.get(id);
  }

  async getVectors(ids: string[]): Promise<VectorStoreItem[]> {
    const result: VectorStoreItem[] = [];
    for (const id of ids) {
      const vector = await this.getVector(id);
      if (vector) {
        result.push(vector);
      }
    }
    return result;
  }

  async searchSimilarVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, string[] | string>
  ): Promise<{ id: string; score: number; metadata?: Record<string, string[] | string | number> }[]> {
    // 计算余弦相似度
    const cosineSimilarity = (a: number[], b: number[]): number => {
      const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    };

    // 过滤向量（如果有过滤条件）
    const filteredVectors = Array.from(this.vectors.values()).filter(vector => {
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
  }

  async deleteVector(id: string): Promise<void> {
    this.vectors.delete(id);
  }

  async clear(): Promise<void> {
    this.vectors.clear();
  }

  async hasVector(id: string): Promise<boolean> {
    return this.vectors.has(id);
  }

  async getVectorCount(): Promise<number> {
    return this.vectors.size;
  }

  async updateVector(
    id: string,
    newEmbedding: number[],
    metadata?: Record<string, string[] | string | number>
  ): Promise<void> {
    const existingVector = this.vectors.get(id);
    if (!existingVector) {
      throw new Error(`Vector with id ${id} not found`);
    }

    // 更新向量，保留原有metadata（如果没有提供新的metadata）
    this.vectors.set(id, {
      id,
      embedding: newEmbedding,
      metadata: metadata || existingVector.metadata
    });
  }
}
