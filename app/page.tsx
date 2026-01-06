"use client";
import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import SearchBar from "./components/SearchBar";
import IconGrid from "./components/IconGrid";
import IconPreview from "./components/IconPreview";
import TabButton from "./components/TabButton";
import { iconSearchService } from "../services/IconSearchService";
import type { SearchResult } from "../types/icon";
import { SearchProvider, SearchContext } from "../context/SearchContext";
import { embeddingService } from "../services/embedding";
import { APP_NAME, APP_DESCRIPTION } from "../constants";
import { useToast } from "./components/ToastProvider";
 
// 创建一个使用SearchContext的内部组件
const HomeContent: React.FC = () => {
  const context = useContext(SearchContext);
  const [, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const { showToast } = useToast();

  // 选项卡状态
  const [activeTab, setActiveTab] = useState<"vectorModel" | "vectorStore">(
    "vectorModel"
  );

  // 加载图标库列表
  
  // 处理搜索查询
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      showToast("请输入关键词再搜索", "error");
      return;
    }
    context?.setQuery(query);
    setHasSearched(true);
    try {
      setIsLoading(true);
      const results = await iconSearchService.searchIcons(
        query,
        context?.filters || { libraries: [], categories: [], tags: [] }
      );
      context?.setResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理图标点击
  const handleIconClick = (result: SearchResult) => {
    context?.setSelectedIcon(result.icon);
  };

  // 关闭图标预览
  const handleClosePreview = () => {
    context?.setSelectedIcon(null);
  };

  // 加载图标库列表
  

  // 更新选中的图标库
  

  // 处理向量存储类型切换
  

  // 处理模型切换
  

  // 如果context不存在，显示错误信息
  if (!context) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Search context not available
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* GitHub链接和设置按钮 */}
        <div className="absolute top-4 right-4 flex items-center gap-4">
          {/* 模型切换设置 */}
          <div className="relative">
            {/* <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center"
              aria-label="Settings"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button> */}

            {/* 设置菜单 */}
            {showSettingsMenu && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[800px] max-w-3xl h-[70vh] overflow-hidden flex flex-col">
                  {/* 标题栏 */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Settings
                    </h2>
                    <button
                      onClick={() => setShowSettingsMenu(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* 内容区域 - 左右分栏 */}
                  <div className="flex flex-1 overflow-hidden">
                    {/* 左侧选项卡 */}
                    <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <TabButton
                        tab="vectorModel"
                        label="Vector Model"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                      />
                      
                      <TabButton
                        tab="vectorStore"
                        label="Vector Store Type"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                      />
                    </div>

                    {/* 右侧内容 */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* 向量模型选项卡内容 */}
                      {activeTab === "vectorModel" && (
                        <div>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                            Vector Model
                          </h3>
                          <div className="space-y-2">
                            <div className="px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              Multilingual (Xenova/paraphrase-multilingual-MiniLM-L12-v2)
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Vector model is fixed and cannot be changed.
                            </div>
                          </div>
                          
                        </div>
                      )}

                      {/* 向量存储类型选项卡内容 */}
                      {activeTab === "vectorStore" && (
                        <div>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                            Vector Store Type
                          </h3>
                          <div className="space-y-2">
                            <div className="px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              Cloud ChromaDB
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Vector store type is fixed to Chroma Cloud.
                            </div>
                          </div>
                        </div>
                      )}

                      
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GitHub链接 */}
          <a
            href="https://github.com/lexmin0412/gimme-icon-next"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="GitHub Repository"
          >
            <svg
              className="w-8 h-8"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
            <Image src="/icon.svg" alt="App Icon" width={36} height={36} />
            {APP_NAME}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{APP_DESCRIPTION}</p>
        </div>

        <SearchBar onSearch={handleSearch} />

        {/* <FilterPanel
          filters={context.filters}
          availableFilters={availableFilters}
          onFilterChange={handleFilterChange}
        /> */}

        {hasSearched && (
          <IconGrid 
            results={context?.results || []} 
            onIconClick={handleIconClick}
          />
        )}

        <IconPreview
          icon={context.selectedIcon || null}
          onClose={handleClosePreview}
        />
      </div>
    </div>
  );
};

// 主Home组件提供SearchContext
const Home: React.FC = () => {
  // 主组件负责处理初始化加载状态
  const [isAppLoading, setIsAppLoading] = useState(true);

  // 初始化应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 初始化嵌入服务
        await embeddingService.initialize();

        await iconSearchService.switchVectorStore({ type: "cloud-chroma" });
        await iconSearchService.initialize(false);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsAppLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isAppLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Initializing icon search...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SearchProvider>
      <HomeContent />
    </SearchProvider>
  );
};

export default Home;
