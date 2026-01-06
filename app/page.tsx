"use client";
import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import SearchBar from "./components/SearchBar";
import IconGrid from "./components/IconGrid";
import IconDetail from "./components/IconDetail";
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
  const { showToast } = useToast();

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

  // 如果context不存在，显示错误信息
  if (!context) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Search context not available
      </div>
    );
  }

  const isSelected = !!context.selectedIcon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      {!hasSearched ? (
        // 初始化状态：完全居中
        <div className="flex flex-col items-center justify-center min-h-screen px-4 -mt-16">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
              <Image src="/icon.svg" alt="App Icon" width={48} height={48} />
              {APP_NAME}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {APP_DESCRIPTION}
            </p>
          </div>
          <div className="w-full max-w-2xl">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      ) : (
        // 搜索后的状态
        <>
          {/* 顶部固定导航栏 */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
              {/* 左侧 Logo 和 标题 */}
              <div className="flex items-center gap-2 shrink-0">
                <Image src="/icon.svg" alt="App Icon" width={28} height={28} />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                  {APP_NAME}
                </h1>
              </div>

              {/* 中间搜索框 */}
              <div className="flex-1 max-w-2xl">
                <SearchBar onSearch={handleSearch} />
              </div>

              {/* 右侧 GitHub 链接 */}
              <div className="shrink-0">
                <a
                  href="https://github.com/lexmin0412/gimme-icon-next"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  aria-label="GitHub Repository"
                >
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* 页面主内容区域，留出导航栏高度 */}
          <div className="container mx-auto px-4 pt-20 pb-8">
            <div className={`flex flex-col lg:flex-row items-start transition-all duration-300 ${isSelected ? "gap-4" : "gap-8"}`}>
              {/* 左侧列表区域 */}
              <div className={`transition-all duration-300 ease-in-out ${isSelected ? "lg:w-7/12 w-full" : "w-full"}`}>
                <IconGrid 
                  results={context?.results || []} 
                  onIconClick={handleIconClick}
                  isCompact={isSelected}
                />
              </div>

              {/* 右侧详情区域 */}
              {context.selectedIcon && (
                <div className="lg:w-5/12 w-full sticky top-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <IconDetail 
                    icon={context.selectedIcon} 
                    onClose={handleClosePreview}
                    showCloseButton={true}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
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
