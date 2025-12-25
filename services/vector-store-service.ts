import type { IVectorStore } from './vector-stores/IVectorStore';
import { IndexedDBVectorStore } from './vector-stores/IndexedDBVectorStore';
import { LocalChromaVectorStore } from './vector-stores/LocalChromaVectorStore';
import { CloudChromaVectorStore } from './vector-stores/CloudChromaVectorStore';

export type VectorStoreType = 'indexed-db' | 'local-chroma' | 'cloud-chroma';

export interface IndexedDBVectorStoreConfig {
  type: 'indexed-db';
  storeName?: string;
}

export interface LocalChromaVectorStoreConfig {
  type: 'local-chroma';
  collectionName?: string;
  persistDirectory?: string;
}

export interface CloudChromaVectorStoreConfig {
  type: 'cloud-chroma';
  collectionName?: string;
  apiKey?: string;
  tenant?: string;
  database?: string;
}

export type VectorStoreConfig =
  | IndexedDBVectorStoreConfig
  | LocalChromaVectorStoreConfig
  | CloudChromaVectorStoreConfig;

const instances: Map<string, IVectorStore> = new Map();

/**
 * Get or create a vector store instance based on config.
 * @param config Vector store configuration
 * @param instanceKey Optional key to distinguish multiple instances of the same type
 * @returns IVectorStore instance
 */
export const getVectorStore = (
  config: VectorStoreConfig,
  instanceKey: string = 'default'
): IVectorStore => {
  const key = `${config.type}-${instanceKey}`;

  if (instances.has(key)) {
    return instances.get(key)!;
  }

  let vectorStore: IVectorStore;

  switch (config.type) {
    case 'indexed-db':
      vectorStore = new IndexedDBVectorStore(config.storeName);
      break;

    case 'local-chroma':
      // LocalChroma uses ChromaClient which might not work in browser directly or requires special handling
      // User prompt says: "if local IndexedDB... match data... Chroma uses API/SDK"
      // Assuming LocalChroma is for server-side or local environment.
      if (typeof window !== 'undefined') {
        throw new Error('LocalChromaVectorStore is not supported in browser environment.');
      }
      vectorStore = new LocalChromaVectorStore(
        config.collectionName,
        config.persistDirectory
      );
      break;

    case 'cloud-chroma':
      vectorStore = new CloudChromaVectorStore(
        config.collectionName
      );
      break;

    default:
        const unknownConfig = config as { type?: unknown };
        throw new Error(`Unsupported vector store type: ${unknownConfig.type}`);
  }

  instances.set(key, vectorStore);
  return vectorStore;
};
