import type { IVectorStore, VectorStoreItem, SearchResult } from "./IVectorStore";

export class CloudChromaVectorStore implements IVectorStore {
  private initialized: boolean = false;

  constructor() {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // CloudChromaVectorStore 是给客户端使用的，不需要在服务端初始化
      // 实际的初始化会在第一次 API 调用时进行

      this.initialized = true;
      console.log("CloudChromaVectorStore initialized successfully");
    } catch (error) {
      console.error("Failed to initialize CloudChromaVectorStore:", error);
      throw error;
    }
  }

  async addVector(item: VectorStoreItem): Promise<void> {
    await this.batchAddVectors([item]);
  }

  async batchAddVectors(items: VectorStoreItem[]): Promise<void> {
    const response = await fetch("/api/chroma/add-vectors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        items
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to add vectors");
    }
  }

  async updateVector(id: string, vector: number[], metadata?: Record<string, any>): Promise<void> {
    await this.batchUpdateVectors([{ id, vector, metadata }]);
  }

  async batchUpdateVectors(items: { id: string; vector: number[]; metadata?: Record<string, any> }[]): Promise<void> {
    // Reuse addVectors since it uses upsert
    const vectorItems = items.map(item => ({
      id: item.id,
      embedding: item.vector,
      metadata: item.metadata
    }));
    await this.batchAddVectors(vectorItems);
  }

  async deleteVector(id: string): Promise<void> {
    const response = await fetch("/api/chroma/delete-vector", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        id
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to delete vector");
    }
  }

  async batchDeleteVectors(ids: string[]): Promise<void> {
    // Implement parallel delete since no batch delete API yet
    await Promise.all(ids.map(id => this.deleteVector(id)));
  }

  async getVector(id: string): Promise<VectorStoreItem | undefined> {
    const vectors = await this.getVectors([id]);
    return vectors.length > 0 ? vectors[0] : undefined;
  }

  async getVectors(ids: string[]): Promise<VectorStoreItem[]> {
    const response = await fetch("/api/chroma/get-vectors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        ids
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to get vectors");
    }

    return data.vectors || [];
  }

  async searchVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, any>
  ): Promise<SearchResult[]> {
    const response = await fetch("/api/chroma/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queryEmbedding: queryVector,
        limit,
        filters
      }),
    });

    const data = await response.json();
    if (!data.success) {
      console.error("API search failed:", data.error);
      throw new Error(data.error || "Search failed");
    }
    
    return data.results;
  }

  async hasVector(id: string): Promise<boolean> {
    const vector = await this.getVector(id);
    return !!vector;
  }

  async getVectorCount(): Promise<number> {
    const response = await fetch("/api/chroma/count");

    const data = await response.json();
    return data.count || 0;
  }

  async clear(): Promise<void> {
    const response = await fetch("/api/chroma/clear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to clear vector store");
    }
  }
}
