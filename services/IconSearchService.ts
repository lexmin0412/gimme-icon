import type { Icon, SearchResult, FilterOptions } from "../types/icon";
import { embeddingService } from "./embedding";
import type {
  IVectorStore,
  VectorStoreItem,
} from "./vector-stores/IVectorStore";
import { getVectorStore, VectorStoreConfig } from "./vector-store-service";
import localforage from "localforage";

import { withTimeout } from "../utils";
import { loadIcons } from "./icons";

import { generateDescriptionForIcon } from "@/utils";
import { INITIAL_LOAD_COUNT } from "@/constants";

/**
 * 生成统一的向量存储名称
 * @param modelId 当前模型ID
 * @returns 格式化的向量存储名称
 */
export const getVectorStoreName = (modelId: string): string => {
  // 替换模型ID中的斜杠为下划线，确保命名在所有存储系统中有效
  return `gimme_icons_${modelId.replace(/\//g, "_")}`;
};

// 检测是否在浏览器环境（客户端）
const isClient = typeof window !== "undefined";

class IconSearchService {
  private initialized: boolean = false;
  private icons: Icon[] = [];
  private vectorStore: IVectorStore;
  private vectorStoreConfig: VectorStoreConfig;

  constructor(vectorStoreConfig: VectorStoreConfig = { type: 'indexed-db' }) {
    // 如果是indexed-db类型且没有指定storeName，则使用当前模型ID生成storeName
    if (vectorStoreConfig.type === "indexed-db" && !vectorStoreConfig.storeName) {
      vectorStoreConfig = {
        ...vectorStoreConfig,
        storeName: getVectorStoreName(embeddingService.getCurrentModel())
      };
    }
    console.log('vectorStoreConfig', vectorStoreConfig)
    this.vectorStoreConfig = vectorStoreConfig;
    this.vectorStore = getVectorStore(vectorStoreConfig);
  }

  async initialize(forceRegenerate: boolean = false, customSelectedLibraries?: string[]) {
    console.log(
      "重新初始化",
      this.initialized,
      "forceRegenerate:",
      forceRegenerate
    );
    if (this.initialized && !forceRegenerate) return;

    // 加载所有图标
    // 获取用户选择的图标库，如果没有则使用默认值
    let selectedLibraries = ["lucide", "heroicons", "ant-design"];
    
    // 优先使用传入的自定义配置
    if (customSelectedLibraries && customSelectedLibraries.length > 0) {
      selectedLibraries = customSelectedLibraries;
    } else {
      // 否则从localStorage读取
      const savedLibraries = localStorage.getItem("selectedIconLibraries");
      if (savedLibraries) {
        try {
          selectedLibraries = JSON.parse(savedLibraries);
        } catch (error) {
          console.error(
            "获取图标库设置失败，降级为默认值，请检查设置",
            error
          );
        }
      }
    }
    console.log('selectedLibraries', selectedLibraries)
    const innerIcons = await loadIcons(selectedLibraries);
    this.icons = innerIcons;

    try {
      // 如果是客户端且使用云向量存储，跳过本地初始化，因为实际操作会通过API路由在服务端执行
      if (isClient && this.vectorStoreConfig.type === "cloud-chroma") {
        this.initialized = true;
        console.log(
          "Cloud vector store initialization skipped on client (will use API routes)"
        );
        return;
      }

      // 初始化向量存储，添加超时处理
      const timeoutMs = 60000; // 60秒超时
      await withTimeout(
        () => this.vectorStore.initialize(),
        timeoutMs,
        `Vector store initialization timed out after ${timeoutMs}ms`
      );

      // 只在非降级模式下为图标生成向量
      if (!embeddingService.isUsingFallback()) {
        // 检查是否需要生成向量
        let shouldGenerateVectors = false;
        
        // 使用统一的向量存储命名函数
        const vectorStoreName = getVectorStoreName(embeddingService.getCurrentModel());
        let vectorItems: VectorStoreItem[] = [];

        // 检查IndexedDB中是否已有向量数据
        if (isClient && !forceRegenerate) {
          try {
            console.log(
              `Checking IndexedDB for vector store: ${vectorStoreName}`
            );
            const storedVectors = await localforage.getItem<
              VectorStoreItem[]
            >(vectorStoreName);

            if (storedVectors && storedVectors.length > 0) {
              console.log(
                `Found ${storedVectors.length} vectors in IndexedDB, reusing them completely`
              );
              // 如果已经有向量数据，完全跳过向量生成逻辑
              shouldGenerateVectors = false;
              vectorItems = storedVectors;
            } else {
              console.log(
                "No vectors found in IndexedDB, generating new ones"
              );
              shouldGenerateVectors = true;
            }
          } catch (error) {
            console.error("Error accessing IndexedDB:", error);
            shouldGenerateVectors = true;
          }
        } else {
          console.log(
            "Force regenerate or not client, generating vectors"
          );
          shouldGenerateVectors = true;
        }

        console.log('shouldGenerateVectors', shouldGenerateVectors)
        if (shouldGenerateVectors) {
          // 为每个图标生成向量，添加超时处理
          const generateEmbeddingsPromise = async () => {
            console.time("生成所有图标向量耗时");

            const items: VectorStoreItem[] = [];
            for (const icon of this.icons) {
              // 生成图标描述 优化搜索效果
              const document = generateDescriptionForIcon(
                icon.name,
                icon.category
              );
              const embedding = await embeddingService.generateEmbedding(
                document
              );

              items.push({
                id: icon.id,
                embedding: embedding,
                metadata: {
                  name: icon.name,
                  library: icon.library,
                  category: icon.category,
                  tags: icon.tags,
                  synonyms: icon.synonyms,
                },
              } as VectorStoreItem);
            }
            console.timeEnd("生成所有图标向量耗时");
            return items;
          };

          // 生成向量超时控制
          vectorItems = (await withTimeout(
            generateEmbeddingsPromise,
            timeoutMs * 2,
            `Generating embeddings timed out after ${timeoutMs * 2}ms`
          )) as VectorStoreItem[];

          console.log("generatedVectorItems", vectorItems);

          // 将生成的向量存储到IndexedDB中
          if (isClient && vectorItems.length > 0) {
            try {
              console.log(
                `Storing ${vectorItems.length} vectors in IndexedDB: ${vectorStoreName}`
              );
              await localforage.setItem(vectorStoreName, vectorItems);
              console.log("Vectors stored in IndexedDB successfully");
            } catch (error) {
              console.error("Error storing vectors in IndexedDB:", error);
            }
          }
        } else {
          console.log(`Using existing vectors from IndexedDB, skipping generation`);
        }

        // 批量添加向量，添加超时处理
        if (vectorItems.length > 0) {
          await withTimeout(
            () => this.vectorStore.batchAddVectors(vectorItems),
            timeoutMs,
            `Adding vectors timed out after ${timeoutMs}ms`
          );

          console.log(`Added ${vectorItems.length} vectors to store`);
        } else {
          console.log(`No vectors to add to store`);
        }
      } else {
        console.log("Using fallback mode, skipping embedding generation");
      }

      this.initialized = true;
      console.log("Vector store initialized successfully");
    } catch (error) {
      console.error("Failed to initialize vector store:", error);
      // 确保即使向量存储初始化失败，应用也能继续运行
      this.initialized = true;
      // 如果embeddingService还没有处于降级模式，强制切换到降级模式
      if (!embeddingService.isUsingFallback()) {
        console.log(
          "Forcing fallback mode due to vector store initialization failure"
        );
      }
    }
  }

  async searchIcons(
    query: string,
    _filters: FilterOptions,
    limit: number = INITIAL_LOAD_COUNT
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!query.trim()) {
      return [];
    }

    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      const response = await fetch("/api/chroma/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queryEmbedding,
          limit: limit,
          filters: {},
        }),
      });

      const data = await response.json();
      if (!data.success || !Array.isArray(data.results)) {
        return [];
      }

      const results: SearchResult[] = [];
      for (const r of data.results) {
        const icon = this.parseIconFromMetadata(r.id, r.metadata);
        if (icon) {
          results.push({ icon, score: r.score });
        }
      }

      return results;
    } catch (error) {
      console.error("Search failed:", error);
      return [];
    }
  }

  /**
   * 从元数据中解析图标对象
   * @param id 图标ID
   * @param metadata 元数据
   * @returns 解析出的图标对象，如果解析失败则返回 undefined
   */
  private parseIconFromMetadata(id: string, metadata?: Record<string, unknown>): Icon | undefined {
    if (!metadata) {
      // 如果没有元数据，尝试从内存中找（作为备份）
      return this.icons.find((i) => i.id === id);
    }

    try {
      const name = String(metadata.name ?? id.split("__")[1] ?? id);
      const library = String(metadata.library ?? id.split("__")[0] ?? "");
      const category = String(metadata.category ?? "");
      const tagsRaw = metadata.tags;
      const synonymsRaw = metadata.synonyms;
      
      const tags =
        typeof tagsRaw === "string"
          ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
          : Array.isArray(tagsRaw)
          ? (tagsRaw as unknown[]).map((t) => String(t)).filter(Boolean)
          : (name.includes("-") ? name.split("-") : [name]);
          
      const synonyms =
        typeof synonymsRaw === "string"
          ? synonymsRaw.split(",").map((t) => t.trim()).filter(Boolean)
          : Array.isArray(synonymsRaw)
          ? (synonymsRaw as unknown[]).map((t) => String(t)).filter(Boolean)
          : [];

      return {
        id,
        name,
        svg: "", // 向量存储通常不存 SVG 字符串，前端会根据 id/name/library 渲染
        library,
        category,
        tags,
        synonyms,
      };
    } catch (error) {
      console.error(`Error parsing icon from metadata for ${id}:`, error);
      return this.icons.find((i) => i.id === id);
    }
  }

  // 获取所有可用的过滤选项
  getFilterOptions(): {
    libraries: string[];
    categories: string[];
    tags: string[];
  } {
    const libraries = Array.from(
      new Set(this.icons.map((icon) => icon.library))
    );
    const categories = Array.from(
      new Set(this.icons.map((icon) => icon.category))
    );
    const tags = Array.from(new Set(this.icons.flatMap((icon) => icon.tags)));

    return {
      libraries,
      categories,
      tags,
    };
  }

  // 获取当前使用的向量存储
  getVectorStore(): IVectorStore {
    return this.vectorStore;
  }

  // 获取当前向量存储配置
  getVectorStoreConfig(): VectorStoreConfig {
    return this.vectorStoreConfig;
  }

  // 重新初始化向量存储
  async reInitialize(): Promise<void> {
    console.log("开始重新初始化向量存储");

    // 首先强制重置初始化状态
    this.initialized = false;
    console.log("重置initialized状态为:", this.initialized);

    // 直接创建新的向量存储实例，不依赖工厂的remove方法
    // 使用唯一的instanceKey确保获取全新实例
    const uniqueKey = Date.now().toString();
    
    // 如果是indexed-db类型且没有指定storeName，则使用当前模型ID生成storeName
    const vectorStoreConfig = this.vectorStoreConfig.type === "indexed-db" && !this.vectorStoreConfig.storeName 
      ? {
          ...this.vectorStoreConfig,
          storeName: getVectorStoreName(embeddingService.getCurrentModel())
        }
      : this.vectorStoreConfig;
      
    this.vectorStore = getVectorStore(
      vectorStoreConfig,
      uniqueKey
    );
    console.log("创建了新的向量存储实例");

    try {
      // 调用initialize方法前，再次确认initialized状态
      this.initialized = false;
      console.log("调用initialize前的initialized状态:", this.initialized);

      // 重新调用初始化方法，传入forceRegenerate: true确保重新生成向量
      await this.initialize(true);
    } catch (error) {
      console.error("重新初始化向量存储失败:", error);
      // 即使出错，也不自动设置initialized为true
      // 这样下次调用时还能继续尝试初始化
      this.initialized = false;
    }
  }

  // 切换向量存储
  async switchVectorStore(config: VectorStoreConfig): Promise<void> {
    this.vectorStoreConfig = config;

    // 如果是客户端且使用云向量存储，通过API路由配置
    if (isClient && config.type === "cloud-chroma") {
      try {
        const response = await fetch("/api/chroma/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });

        const data = await response.json();
        if (!data.success) {
          console.error("Failed to configure cloud vector store:", data.error);
        }
      } catch (error) {
        console.error("Failed to call config API:", error);
      }
    }

    // 调用重新初始化方法，确保使用新的配置重新初始化
    await this.reInitialize();
  }
}

// 默认使用indexed-db向量存储，自动使用当前模型ID生成storeName
export const iconSearchService = new IconSearchService();
