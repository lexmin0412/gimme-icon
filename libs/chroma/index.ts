import { CloudClient, ChromaClient as DClient } from "chromadb";

// 全局 Chroma 客户端实例
let globalChromaClient: CloudClient | null = null;
let globalChromaCollections = new Map<string, any>();

// 从环境变量获取 Chroma 配置
function getChromaEnvConfig() {
  const apiKey = process.env.CHROMA_API_KEY;
  const tenant = process.env.CHROMA_TENANT;
  const database = process.env.CHROMA_DATABASE;

  if (!apiKey || !tenant || !database) {
    throw new Error('Missing required Chroma environment variables: CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE');
  }

  return { apiKey, tenant, database };
}

/**
 * 获取全局 Chroma 客户端实例
 * @param isCloud 是否官方云服务
 */
export async function getGlobalChromaClient(isCloud: boolean = false): Promise<CloudClient> {
  if (!globalChromaClient) {
    const { apiKey, tenant, database } = getChromaEnvConfig();
    const { CloudClient } = await import("chromadb");
    
    // 
    if (isCloud) {
      globalChromaClient = new CloudClient({
        apiKey,
        tenant,
        database,
      });
    } else {
      globalChromaClient = new DClient({
        host: 'http://localhost',
        port: 3003,
        ssl: false,
        tenant,
        database,
      })
    }
    console.log(`Created global ChromaClient for tenant: ${tenant}, database: ${database}`);
  }
  
  return globalChromaClient;
}

// 获取或创建全局集合
export async function getGlobalChromaCollection(collectionName: string, metadata?: Record<string, any>): Promise<any> {
  if (!globalChromaCollections.has(collectionName)) {
    const client = await getGlobalChromaClient();
    const collection = await client.getOrCreateCollection({
      name: collectionName,
      metadata: {
        description: "Gimme Icon Vector Store Collection",
        createdAt: new Date().toISOString(),
        ...metadata,
      },
    });
    
    globalChromaCollections.set(collectionName, collection);
    console.log(`Created/get collection: ${collectionName}`);
  }
  
  return globalChromaCollections.get(collectionName);
}

// 清理全局实例（用于测试或重置）
export function clearGlobalChromaInstances(): void {
  globalChromaClient = null;
  globalChromaCollections.clear();
  console.log("Cleared all global Chroma instances");
}

export class ChromaCollection {
  private name: string;
  private metadata?: Record<string, any>;

  constructor(collectionName: string, metadata?: Record<string, any>) {
    this.name = collectionName;
    this.metadata = metadata;
  }

  async getInstance() {
    return await getGlobalChromaCollection(this.name, this.metadata);
  }

  async upsert(options: { ids: string[]; embeddings: number[][]; metadatas?: any[] }) {
    const collection = await this.getInstance();
    return await collection.upsert(options);
  }

  async get(options: { ids?: string[] }) {
    const collection = await this.getInstance();
    return await collection.get(options);
  }

  async query(options: { queryEmbeddings?: number[][]; nResults?: number; where?: Record<string, any> }) {
    const collection = await this.getInstance();
    console.log('options', options)
    return await collection.query(options);
  }

  async delete(options: { ids?: string[] }) {
    const collection = await this.getInstance();
    return await collection.delete(options);
  }

  async count() {
    const collection = await this.getInstance();
    return await collection.count();
  }
}

// 为了向后兼容，保留 ChromaClient 类，但现在它只是全局客户端的包装
export class ChromaClient {
  async getOrCreateCollection(options: { name: string; metadata?: Record<string, any> }) {
    return new ChromaCollection(options.name, options.metadata);
  }

  async deleteCollection(options: { name: string }) {
    try {
      const client = await getGlobalChromaClient();
      await client.deleteCollection({ name: options.name });
      
      // 从缓存中移除
      globalChromaCollections.delete(options.name);
    } catch (error) {
      console.error("Failed to delete collection:", error);
      throw error;
    }
  }

  // 清理缓存的客户端实例（用于测试或重置）
  static clearCache(): void {
    clearGlobalChromaInstances();
  }

  // 获取当前缓存状态（用于调试）
  static getCacheSize(): number {
    return globalChromaCollections.size;
  }
}

// 导出 CloudClient 以兼容现有代码
export { ChromaClient as CloudClient };