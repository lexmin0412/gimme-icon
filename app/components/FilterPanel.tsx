'use client';
import React, { useState, useRef, useEffect } from 'react';
import type { FilterOptions } from '@/types/icon';
import { iconSearchService } from '@/services/IconSearchService';
import type { VectorStoreConfig, VectorStoreType } from '@/services/vector-store-service';
import { useToast } from './ToastProvider';

interface FilterPanelProps {
  filters: FilterOptions;
  availableFilters: {
    libraries: string[];
    categories: string[];
    tags: string[];
  };
  onFilterChange: (filters: FilterOptions) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
  filters, 
  availableFilters, 
  onFilterChange 
}) => {
  const { showToast } = useToast();
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  
  // 向量存储配置状态
  const [vectorStoreType, setVectorStoreType] = useState<string>('memory');
  const [apiKey, setApiKey] = useState<string>('');
  const [tenant, setTenant] = useState<string>('');
  const [database, setDatabase] = useState<string>('');
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  // 监听Tags容器的高度，判断是否需要显示展开按钮
  useEffect(() => {
    if (tagsContainerRef.current) {
      const container = tagsContainerRef.current;
      
      // 保存当前展开状态
      const currentExpandedState = isTagsExpanded;
      
      // 强制重排
      container.style.maxHeight = 'auto';
      const actualHeight = container.scrollHeight;
      
      // 默认一行的高度大约是2rem (32px)，所以如果实际高度超过32px，就显示展开按钮
      setShowExpandButton(actualHeight > 32);
      
      // 恢复之前的展开状态，而不是强制重置
      container.style.maxHeight = currentExpandedState ? '6rem' : '2rem';
    }
  }, [availableFilters.tags, isTagsExpanded]);

  const handleLibraryChange = (library: string) => {
    const updatedLibraries = filters.libraries.includes(library)
      ? filters.libraries.filter(l => l !== library)
      : [...filters.libraries, library];
    
    onFilterChange({ ...filters, libraries: updatedLibraries });
  };

  const handleCategoryChange = (category: string) => {
    const updatedCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    onFilterChange({ ...filters, categories: updatedCategories });
  };

  const handleTagChange = (tag: string) => {
    const updatedTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    
    onFilterChange({ ...filters, tags: updatedTags });
  };

  const clearFilters = () => {
    onFilterChange({ libraries: [], categories: [], tags: [] });
  };

  const toggleTagsExpanded = () => {
    setIsTagsExpanded(!isTagsExpanded);
  };
  
  // 切换向量存储配置面板
  const toggleConfigExpanded = () => {
    setIsConfigExpanded(!isConfigExpanded);
  };
  
  // 应用向量存储配置
  const applyVectorStoreConfig = async () => {
    setIsConfiguring(true);
    
    try {
      const type: VectorStoreType =
        vectorStoreType === 'memory' ? 'indexed-db'
        : vectorStoreType === 'local-chroma' ? 'local-chroma'
        : 'cloud-chroma';
      const config: VectorStoreConfig = {
        type,
        ...(vectorStoreType === 'local-chroma' && {
          persistDirectory: './chromadb_data'
        }),
        ...(vectorStoreType === 'cloud-chroma' && {
          apiKey,
          tenant,
          database
        })
      };
      
      await iconSearchService.switchVectorStore(config);
      console.log('Vector store configuration applied successfully');
    } catch (error) {
      console.error('Failed to apply vector store configuration:', error);
      showToast('Failed to apply vector store configuration. Please check the console for details.', 'error');
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <div className="p-4 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
        {(filters.libraries.length > 0 || filters.categories.length > 0 || filters.tags.length > 0) && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Libraries Filter */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Icon Libraries</h3>
          <div className="flex flex-wrap gap-2">
            {availableFilters.libraries.map((library) => (
              <button
                key={library}
                onClick={() => handleLibraryChange(library)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filters.libraries.includes(library)
                  ? 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}
                `}
              >
                {library}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Filter */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {availableFilters.categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filters.categories.includes(category)
                  ? 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tags Filter */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tags</h3>
          <div
            ref={tagsContainerRef}
            className={`flex flex-wrap gap-2 overflow-y-auto transition-all duration-300 ${isTagsExpanded
              ? 'max-h-24' // 三行高度，每行大约2rem
              : 'max-h-8' // 一行高度
            }`}
            style={{
              maxHeight: isTagsExpanded ? '6rem' : '2rem'
            }}
          >
            {availableFilters.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagChange(tag)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filters.tags.includes(tag)
                  ? 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}
                `}
              >
                {tag}
              </button>
            ))}
          </div>
          {showExpandButton && (
            <button
              onClick={toggleTagsExpanded}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {isTagsExpanded ? '收起' : '展开'}
            </button>
          )}
        </div>
        
        {/* Vector Store Configuration */}
        <div className="border-t border-gray-200 pt-4 mt-4 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Vector Store</h3>
            <button
              onClick={toggleConfigExpanded}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {isConfigExpanded ? '收起' : '配置'}
            </button>
          </div>
          
          {isConfigExpanded && (
            <div className="space-y-3 mt-2">
              {/* Vector Store Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                  Storage Type
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setVectorStoreType('memory')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${vectorStoreType === 'memory'
                      ? 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}
                    `}
                  >
                    Memory
                  </button>
                  <button
                    onClick={() => setVectorStoreType('local-chroma')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${vectorStoreType === 'local-chroma'
                      ? 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}
                    `}
                  >
                    Local ChromaDB
                  </button>
                  <button
                    onClick={() => setVectorStoreType('cloud-chroma')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${vectorStoreType === 'cloud-chroma'
                      ? 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}
                    `}
                  >
                    Cloud ChromaDB
                  </button>
                </div>
              </div>
              
              {/* Cloud ChromaDB Configuration */}
              {vectorStoreType === 'cloud-chroma' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Tenant
                    </label>
                    <input
                      type="text"
                      value={tenant}
                      onChange={(e) => setTenant(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="default-tenant"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                      Database
                    </label>
                    <input
                      type="text"
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="default-database"
                    />
                  </div>
                </div>
              )}
              
              {/* Apply Button */}
              <div>
                <button
                  onClick={applyVectorStoreConfig}
                  disabled={isConfiguring}
                  className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                >
                  {isConfiguring ? 'Applying...' : 'Apply Configuration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
