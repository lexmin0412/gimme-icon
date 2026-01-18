import React, { createContext, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Icon, SearchResult, FilterOptions } from '../types/icon';
import { iconSearchService } from '../services/IconSearchService';

// 移动这个常量到单独的文件或将其作为默认值的一部分
const DEFAULT_FILTERS: FilterOptions = {
  libraries: [],
  categories: [],
  tags: [],
};

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  setResults: (results: SearchResult[]) => void;
  isLoading: boolean;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  selectedIcon: Icon | null;
  setSelectedIcon: (icon: Icon | null) => void;
  availableFilters: {
    libraries: string[];
    categories: string[];
    tags: string[];
  };
  searchIcons: () => Promise<void>;
}

export const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [selectedIcon, setSelectedIcon] = useState<Icon | null>(null);
  
  // 获取可用的过滤选项并状态化
  const [availableFilters, setAvailableFilters] = useState(iconSearchService.getFilterOptions());

  const searchIcons = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchResults = await iconSearchService.searchIcons(query, filters);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, filters]);

  const value = useMemo(() => ({
    query,
    setQuery,
    results,
    setResults,
    isLoading,
    filters,
    setFilters,
    selectedIcon,
    setSelectedIcon,
    availableFilters,
    searchIcons,
  }), [
    query, 
    results, 
    isLoading, 
    filters, 
    selectedIcon, 
    availableFilters, 
    searchIcons
  ]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
