import type { IVectorStore, VectorStoreItem } from "./IVectorStore";

export class CloudChromaVectorStore implements IVectorStore {
  private initialized: boolean = false;
  private collectionName: string = "gimme_icon_collection";

  constructor(collectionName?: string) {
    if (collectionName) {
      this.collectionName = collectionName;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // CloudChromaVectorStore 是给客户端使用的，不需要在服务端初始化
      // 实际的初始化会在第一次 API 调用时进行

      this.initialized = true;
      console.log("CloudChromaVectorStore initialized successfully");
      console.log(`Collection name: ${this.collectionName}`);
    } catch (error) {
      console.error("Failed to initialize CloudChromaVectorStore:", error);
      throw error;
    }
  }

  async addVector(item: VectorStoreItem): Promise<void> {
    await this.addVectors([item]);
  }

  async addVectors(items: VectorStoreItem[]): Promise<void> {
    const response = await fetch("/api/chroma/add-vectors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        items,
        collectionName: this.collectionName 
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to add vectors");
    }
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
        ids,
        collectionName: this.collectionName 
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to get vectors");
    }

    return data.vectors || [];
  }

  async searchSimilarVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, string[] | string>
  ): Promise<
    {
      id: string;
      score: number;
      metadata?: Record<string, string[] | string | number>;
    }[]
  > {
    const response = await fetch("/api/chroma/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queryEmbedding: queryVector,
        limit,
        filters,
        collectionName: this.collectionName,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to search vectors");
    }

    return data.results || [];
  }

  async deleteVector(id: string): Promise<void> {
    const response = await fetch("/api/chroma/delete-vector", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        id,
        collectionName: this.collectionName 
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to delete vector");
    }
  }

  async clear(): Promise<void> {
    const response = await fetch("/api/chroma/clear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        collectionName: this.collectionName 
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to clear vector store");
    }
  }

  async hasVector(id: string): Promise<boolean> {
    const response = await fetch("/api/chroma/has-vector", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        id,
        collectionName: this.collectionName 
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to check vector existence");
    }

    return data.hasVector || false;
  }

  async getVectorCount(): Promise<number> {
    const response = await fetch(`/api/chroma/count?collectionName=${encodeURIComponent(this.collectionName)}`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to get vector count");
    }

    return data.count || 0;
  }

  async updateVector(id: string, newEmbedding: number[], metadata?: Record<string, string[] | string | number>): Promise<void> {
    const response = await fetch("/api/chroma/update-vector", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        id, 
        embedding: newEmbedding, 
        metadata,
        collectionName: this.collectionName 
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to update vector");
    }
  }
}
