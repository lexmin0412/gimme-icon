import type { IVectorStore } from './IVectorStore';
import { MemoryVectorStore } from './MemoryVectorStore';
import { LocalChromaVectorStore } from './LocalChromaVectorStore';
import { CloudChromaVectorStore } from './CloudChromaVectorStore';

export type VectorStoreType = 'memory' | 'local-chroma' | 'cloud-chroma';

export interface MemoryVectorStoreConfig {
  type: 'memory';
}

export interface LocalChromaVectorStoreConfig {
  type: 'local-chroma';
  collectionName?: string;
  persistDirectory?: string;
}

export interface CloudChromaVectorStoreConfig {
  type: 'cloud-chroma';
  apiKey: string;
  tenant: string;
  database: string;
  collectionName?: string;
}

export type VectorStoreConfig = 
  | MemoryVectorStoreConfig
  | LocalChromaVectorStoreConfig
  | CloudChromaVectorStoreConfig;

export class VectorStoreFactory {
  private static instances: Map<string, IVectorStore> = new Map();

  /**
   * 创建向量存储实例
   * @param config 向量存储配置
   * @param instanceKey 实例键，用于区分不同配置的相同类型向量存储
   * @returns 向量存储实例
   */
  static createVectorStore(
    config: VectorStoreConfig,
    instanceKey: string = 'default'
  ): IVectorStore {
    const key = `${config.type}-${instanceKey}`;
    
    // 如果实例已存在，直接返回
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    let vectorStore: IVectorStore;

    switch (config.type) {
      case 'memory':
        vectorStore = new MemoryVectorStore();
        break;

      case 'local-chroma':
        // 检查是否在浏览器环境中
        if (typeof window !== 'undefined') {
          throw new Error('LocalChromaVectorStore is not supported in browser environment. Please use MemoryVectorStore instead.');
        }
        vectorStore = new LocalChromaVectorStore(
          config.collectionName,
          config.persistDirectory
        );
        break;

      case 'cloud-chroma':
        // 检查是否在浏览器环境中
        // if (typeof window !== 'undefined') {
        //   throw new Error('CloudChromaVectorStore is not supported in browser environment. Please use MemoryVectorStore instead.');
        // }
        vectorStore = new CloudChromaVectorStore(
          config.apiKey,
          config.tenant,
          config.database,
          config.collectionName
        );
        break;

      default:
        const unknownConfig = config as { type?: unknown };
        throw new Error(`Unsupported vector store type: ${unknownConfig.type}`);
    }

    // 存储实例
    this.instances.set(key, vectorStore);
    return vectorStore;
  }

  /**
   * 获取向量存储实例
   * @param type 向量存储类型
   * @param instanceKey 实例键
   * @returns 向量存储实例，如果不存在返回undefined
   */
  static getVectorStore(
    type: VectorStoreType,
    instanceKey: string = 'default'
  ): IVectorStore | undefined {
    const key = `${type}-${instanceKey}`;
    return this.instances.get(key);
  }

  /**
   * 移除向量存储实例
   * @param type 向量存储类型
   * @param instanceKey 实例键
   * @returns 是否成功移除
   */
  static removeVectorStore(
    type: VectorStoreType,
    instanceKey: string = 'default'
  ): boolean {
    const key = `${type}-${instanceKey}`;
    return this.instances.delete(key);
  }

  /**
   * 清空所有向量存储实例
   */
  static clearAllInstances(): void {
    this.instances.clear();
  }

  /**
   * 获取所有向量存储实例
   * @returns 向量存储实例映射
   */
  static getAllInstances(): Map<string, IVectorStore> {
    return new Map(this.instances);
  }

  /**
   * 获取默认配置的向量存储实例（内存存储）
   * @returns 默认向量存储实例
   */
  static getDefaultVectorStore(): IVectorStore {
    return this.createVectorStore({ type: 'memory' });
  }
}
