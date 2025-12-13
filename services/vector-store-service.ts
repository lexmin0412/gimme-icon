import type { Icon, SearchResult, FilterOptions } from "../types/icon";
import { embeddingService } from "./embedding";
import type {
  IVectorStore,
  VectorStoreItem,
} from "./vector-stores/IVectorStore";
import {
  VectorStoreFactory,
  type VectorStoreConfig,
} from "./vector-stores/VectorStoreFactory";
import localforage from "localforage";
import { generateHash } from "../utils/hash";
import { withTimeout } from "../utils";
import { loadIcons } from "./icons";

import { generateDescriptionForIcon } from "@/utils";

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

class VectorStoreService {
  private initialized: boolean = false;
  private icons: Icon[] = [];
  private vectorStore: IVectorStore;
  private vectorStoreConfig: VectorStoreConfig;

  constructor(vectorStoreConfig: VectorStoreConfig = { type: "memory" }) {
    this.vectorStoreConfig = vectorStoreConfig;
    this.vectorStore = VectorStoreFactory.createVectorStore(vectorStoreConfig);
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
        // 如果强制重新生成，或者向量计数为0，则生成向量
        let shouldGenerateVectors = forceRegenerate;

        if (!shouldGenerateVectors) {
          // 检查是否需要生成向量，添加超时处理
          const vectorCount = await withTimeout(
            () => this.vectorStore.getVectorCount(),
            timeoutMs,
            `Get vector count timed out after ${timeoutMs}ms`
          );

          console.log("vectorCount", vectorCount);
          shouldGenerateVectors = vectorCount === 0;
        }

        if (shouldGenerateVectors) {
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
                  `Found ${storedVectors.length} vectors in IndexedDB, reusing them`
                );
                vectorItems = storedVectors;
              } else {
                console.log(
                  "No vectors found in IndexedDB, generating new ones"
                );
              }
            } catch (error) {
              console.error("Error accessing IndexedDB:", error);
            }
          } else {
            console.log(
              "Force regenerate or not client, skipping IndexedDB check"
            );
          }

          // 如果没有从IndexedDB获取到向量，就生成新的向量
          if (vectorItems.length === 0) {
            console.log("Generating embeddings for all icons...");
            // 批量生成向量并添加到存储中

            // 为每个图标生成向量，添加超时处理
            const generateEmbeddingsPromise = async () => {
              console.time("生成所有图标向量耗时");

              const items: VectorStoreItem[] = [];
              for (const icon of this.icons) {
                // const document = `${icon.name} ${icon.tags.join(
                //   " "
                // )} ${icon.synonyms.join(" ")}`;
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
            if (isClient) {
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
          }

          // 批量添加向量，添加超时处理
          await withTimeout(
            () => this.vectorStore.addVectors(vectorItems),
            timeoutMs,
            `Adding vectors timed out after ${timeoutMs}ms`
          );

          console.log(`Added ${vectorItems.length} vectors to store`);
        } else {
          console.log(`Using existing vectors from store`);
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
        // 注意：这里我们不能直接设置embeddingService的useFallback属性，因为它是私有属性
        // 我们可以通过调用generateEmbedding方法来间接触发降级模式
        // 或者，我们可以在VectorStoreService中添加一个标志来指示使用降级模式
        // 由于我们已经在catch块中将initialized设置为true，应用将继续运行，但搜索会使用降级的文本搜索
      }
    }
  }

  async searchIcons(
    query: string,
    filters: FilterOptions,
    limit: number = 50
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // 如果是客户端且使用云向量存储，通过API路由搜索
    if (isClient && this.vectorStoreConfig.type === "cloud-chroma") {
      try {
        const response = await fetch("/api/chroma/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, filters, limit }),
        });

        const data = await response.json();
        if (data.success) {
          return data.results;
        } else {
          console.error("API search failed:", data.error);
        }
      } catch (error) {
        console.error("Failed to call search API:", error);
      }
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

      // 如果处于降级模式，直接使用简单文本搜索
      if (embeddingService.isUsingFallback()) {
        console.log("Using fallback text search");
        return this.simpleTextSearch(query, filters, limit, filteredIcons);
      }

      // 生成查询向量
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // 再次检查是否在生成查询向量后切换到了降级模式
      if (embeddingService.isUsingFallback()) {
        console.log(
          "Switched to fallback mode during query embedding generation"
        );
        return this.simpleTextSearch(query, filters, limit, filteredIcons);
      }

      // 构建向量存储的过滤条件
      const vectorStoreFilters: Record<string, string[] | string> = {};
      if (filters.libraries.length > 0) {
        vectorStoreFilters.library = filters.libraries;
      }
      if (filters.categories.length > 0) {
        vectorStoreFilters.category = filters.categories;
      }
      // Tags过滤需要特殊处理，因为tags是数组

      // 使用向量存储搜索相似向量
      const searchResults = await this.vectorStore.searchSimilarVectors(
        queryEmbedding,
        limit,
        vectorStoreFilters
      );

      // 转换搜索结果，添加完整的图标信息并应用标签过滤
      const results: SearchResult[] = [];
      for (const searchResult of searchResults) {
        const icon = this.icons.find((icon) => icon.id === searchResult.id);
        if (icon) {
          // 应用标签过滤
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

      // 按分数排序并限制结果数量
      const sortedResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // 如果没有结果，使用简单文本搜索作为最终降级
      if (sortedResults.length === 0) {
        console.log("No vector search results, using fallback text search");
        return this.simpleTextSearch(query, filters, limit, filteredIcons);
      }

      return sortedResults;
    } catch (error) {
      console.error("Search failed:", error);
      // 降级为简单的文本匹配搜索
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
    this.vectorStore = VectorStoreFactory.createVectorStore(
      this.vectorStoreConfig,
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

// 默认使用内存向量存储
export const vectorStoreService = new VectorStoreService();
