"use client";
import React, { useState, useEffect, useContext } from "react";
import SearchBar from "./components/SearchBar";
import IconGrid from "./components/IconGrid";
import FilterPanel from "./components/FilterPanel";
import IconPreview from "./components/IconPreview";
import { vectorStoreService } from "../services/vector-store-service";
import type { SearchResult, FilterOptions } from "../types/icon";
import { SearchProvider, SearchContext } from "../context/SearchContext";
import { embeddingService } from "../services/embedding";
import { APP_NAME, APP_DESCRIPTION } from "../constants";
import { AVAILABLE_MODELS, ModelId } from "../services/embedding";
import { useToast } from "./components/ToastProvider";

// 创建一个使用SearchContext的内部组件
const HomeContent: React.FC = () => {
  const context = useContext(SearchContext);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelId>(AVAILABLE_MODELS.MULTILINGUAL);
  const [isChangingModel, setIsChangingModel] = useState(false);
  const { showToast } = useToast();

  const triggerFirstSearch = async () => {
    // 初始搜索（空查询，返回所有图标）
    const initialResults = await vectorStoreService.searchIcons(
      "",
      context?.filters || { libraries: [], categories: [], tags: [] }
    );
    context?.setResults(initialResults);
  };

  // 初始化应用
  useEffect(() => {
    triggerFirstSearch();
    // 获取当前模型并更新状态
    const model = embeddingService.getCurrentModel();
    setCurrentModel(model);
  }, []);

  // 处理搜索查询
  const handleSearch = async (query: string) => {
    context?.setQuery(query);
    try {
      setIsLoading(true);
      const results = await vectorStoreService.searchIcons(
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

  // 处理过滤器变化
  const handleFilterChange = async (newFilters: FilterOptions) => {
    context?.setFilters(newFilters);
    try {
      setIsLoading(true);
      // 重新搜索当前查询并应用新过滤器
      const results = await vectorStoreService.searchIcons("", newFilters);
      context?.setResults(results);
    } catch (error) {
      console.error("Filter search failed:", error);
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

  // 处理模型切换
  const handleModelChange = async (newModel: ModelId) => {
    setIsChangingModel(true);
    setShowSettingsMenu(false);

    try {
      const success = await embeddingService.setModel(newModel);
      if (success) {
        setCurrentModel(newModel);
        // 重新初始化向量存储
        await vectorStoreService.initialize();
        // 刷新搜索结果
        await triggerFirstSearch();
        showToast('Model switched successfully!', 'success');
      } else {
        showToast('Failed to switch model. Falling back to text search.', 'error');
      }
    } catch (error) {
      console.error('Error switching model:', error);
      showToast('An error occurred while switching model.', 'error');
    } finally {
      setIsChangingModel(false);
    }
  };

  // 如果context不存在，显示错误信息
  if (!context) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Search context not available
      </div>
    );
  }

  // 解构context
  const { availableFilters } = context;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* GitHub链接和设置按钮 */}
        <div className="absolute top-4 right-4 flex items-center gap-4">
          {/* 模型切换设置 */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              aria-label="Settings"
              disabled={isChangingModel}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* 模型选择下拉菜单 */}
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2">Vector Model</h3>
                <button
                  onClick={() => handleModelChange(AVAILABLE_MODELS.ENGLISH)}
                  className={`block w-full text-left px-4 py-2 text-sm ${currentModel === AVAILABLE_MODELS.ENGLISH ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  disabled={isChangingModel}
                >
                  {currentModel === AVAILABLE_MODELS.ENGLISH && (
                    <svg className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  English (all-MiniLM-L6-v2)
                </button>
                <button
                  onClick={() => handleModelChange(AVAILABLE_MODELS.MULTILINGUAL)}
                  className={`block w-full text-left px-4 py-2 text-sm ${currentModel === AVAILABLE_MODELS.MULTILINGUAL ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  disabled={isChangingModel}
                >
                  {currentModel === AVAILABLE_MODELS.MULTILINGUAL && (
                    <svg className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  Multilingual (MiniLM-L12-v2)
                </button>
                {isChangingModel && (
                  <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading model...</span>
                    </div>
                  </div>
                )}
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
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
        
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
            <img src="/icon.svg" alt="App Icon" width="36" height="36" />
            {APP_NAME}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {APP_DESCRIPTION}
          </p>
        </div>

        <SearchBar onSearch={handleSearch} />

        <FilterPanel
          filters={context.filters}
          availableFilters={availableFilters}
          onFilterChange={handleFilterChange}
        />

        <IconGrid results={context.results} onIconClick={handleIconClick} />

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
        // 初始化向量存储
        await vectorStoreService.initialize();
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
