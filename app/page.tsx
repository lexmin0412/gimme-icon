'use client';
import React, { useState, useEffect, useContext } from 'react';
import SearchBar from './components/SearchBar';
import IconGrid from './components/IconGrid';
import FilterPanel from './components/FilterPanel';
import IconPreview from './components/IconPreview';
import { chromaService } from './services/chroma';
import type { Icon, SearchResult, FilterOptions } from './types/icon';
import { SearchProvider, SearchContext } from './context/SearchContext';
import { embeddingService } from './services/embedding';

// 创建一个使用SearchContext的内部组件
const HomeContent: React.FC = () => {
  const context = useContext(SearchContext);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 初始化嵌入服务
        await embeddingService.initialize();
        // 初始化向量存储
        await chromaService.initialize();
        
        // 初始搜索（空查询，返回所有图标）
        const initialResults = await chromaService.searchIcons('', context?.filters || { libraries: [], categories: [], tags: [] });
        context?.setResults(initialResults);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [context]);

  // 处理搜索查询
  const handleSearch = async (query: string) => {
    context?.setQuery(query);
    try {
      setIsLoading(true);
      const results = await chromaService.searchIcons(query, context?.filters || { libraries: [], categories: [], tags: [] });
      context?.setResults(results);
    } catch (error) {
      console.error('Search failed:', error);
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
      const results = await chromaService.searchIcons('', newFilters);
      context?.setResults(results);
    } catch (error) {
      console.error('Filter search failed:', error);
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
    return <div className="flex min-h-screen items-center justify-center">Search context not available</div>;
  }

  // 解构context
  const { availableFilters } = context;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Icon Vector Search</h1>
          <p className="text-gray-600 dark:text-gray-400">Search for icons using natural language queries</p>
        </div>
        
        <SearchBar onSearch={handleSearch} />
        
        <FilterPanel 
          filters={context.filters} 
          availableFilters={availableFilters} 
          onFilterChange={handleFilterChange} 
        />
        
        <IconGrid results={context.results} onIconClick={handleIconClick} />
        
        <IconPreview icon={context.selectedIcon || null} onClose={handleClosePreview} />
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
        await chromaService.initialize();
      } catch (error) {
        console.error('Failed to initialize app:', error);
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
          <p className="text-gray-600 dark:text-gray-400">Initializing icon search...</p>
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