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
    filters: FilterOptions,
    limit: number = INITIAL_LOAD_COUNT
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('this.icons', this.icons)

    // 应用过滤器（移到 try 块外面，以便在 catch 中也能使用）
    const filteredIcons = this.icons.filter((icon) => {
      if (
        filters.libraries.length > 0 &&
        !filters.libraries.includes(icon.library)
      ) {
        return false;
      }
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(icon.category)
      ) {
        return false;
      }
      if (
        filters.tags.length > 0 &&
        !filters.tags.some((tag) => icon.tags.includes(tag))
      ) {
        return false;
      }
      return true;
    });

    try {
      // 如果没有查询词，直接返回过滤结果
      if (!query.trim()) {
        return filteredIcons.slice(0, limit).map((icon) => ({
          icon,
          score: 0,
        }));
      }

      const useCloud = isClient && this.vectorStoreConfig.type === "cloud-chroma";
      const useFallback = embeddingService.isUsingFallback();
      if (useFallback) {
        return this.simpleTextSearch(query, filters, limit, filteredIcons);
      }
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      if (useCloud) {
        const response = await fetch("/api/chroma/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ queryEmbedding, limit }),
        });
        const data = await response.json();
        if (!data.success || !Array.isArray(data.results)) {
          return this.simpleTextSearch(query, filters, limit, filteredIcons);
        }
        const results: SearchResult[] = [];
        for (const r of data.results) {
          let icon: Icon | undefined;
          const meta = r.metadata as Record<string, unknown> | undefined;
          if (meta) {
            const id = String(r.id);
            const name = String(meta.name ?? id.split("__")[1] ?? id);
            const library = String(meta.library ?? id.split("__")[0] ?? "");
            const category = String(meta.category ?? "");
            const tagsRaw = meta.tags;
            const synonymsRaw = meta.synonyms;
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
            icon = {
              id,
              name,
              svg: "",
              library,
              category,
              tags,
              synonyms,
            };
          } else {
            icon = this.icons.find((i) => i.id === r.id);
          }
          if (!icon) continue;
          results.push({ icon, score: r.score });
        }
        return results
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      } else {
        const vectorStoreFilters: Record<string, string[] | string> = {};
        if (filters.libraries.length > 0) {
          vectorStoreFilters.library = filters.libraries;
        }
        if (filters.categories.length > 0) {
          vectorStoreFilters.category = filters.categories;
        }
        const searchResults = await this.vectorStore.searchVectors(
          queryEmbedding,
          limit,
          vectorStoreFilters
        );
        const results: SearchResult[] = [];
        for (const searchResult of searchResults) {
          const icon = this.icons.find((icon) => icon.id === searchResult.id);
          if (icon) {
            if (
              filters.tags.length === 0 ||
              filters.tags.some((tag) => icon.tags.includes(tag))
            ) {
              results.push({
                icon,
                score: searchResult.score,
              });
            }
          }
        }
        const sortedResults = results
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        if (sortedResults.length === 0) {
          return this.simpleTextSearch(query, filters, limit, filteredIcons);
        }
        return sortedResults;
      }
    } catch (error) {
      console.error("Search failed:", error);
      return this.simpleTextSearch(query, filters, limit, filteredIcons);
    }
  }

  // 简单的文本匹配搜索（用于降级或开发环境）
  private simpleTextSearch(
    query: string,
    filters: FilterOptions,
    limit: number,
    filteredIcons?: Icon[]
  ): SearchResult[] {
    const lowerQuery = query.toLowerCase();

    // 使用传入的过滤图标，如果没有则先应用过滤
    const iconsToSearch =
      filteredIcons ||
      this.icons.filter((icon) => {
        if (
          filters.libraries.length > 0 &&
          !filters.libraries.includes(icon.library)
        ) {
          return false;
        }
        if (
          filters.categories.length > 0 &&
          !filters.categories.includes(icon.category)
        ) {
          return false;
        }
        if (
          filters.tags.length > 0 &&
          !filters.tags.some((tag) => icon.tags.includes(tag))
        ) {
          return false;
        }
        return true;
      });

    return iconsToSearch
      .filter((icon) => {
        // 简单文本匹配
        const searchText = `${icon.name} ${icon.tags.join(
          " "
        )} ${icon.synonyms.join(" ")}`.toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .slice(0, limit)
      .map((icon) => ({
        icon,
        score: 0,
      }));
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
