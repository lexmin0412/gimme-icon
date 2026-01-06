"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { SearchResult } from "@/types/icon";
import { Icon } from "@iconify/react";
import { INITIAL_LOAD_COUNT } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface IconGridProps {
  results: SearchResult[];
  onIconClick: (result: SearchResult) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (result: SearchResult) => void;
  isCompact?: boolean;
}

const IconGrid: React.FC<IconGridProps> = ({ 
  results, 
  onIconClick,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  isCompact = false
}) => {
  // 首屏加载INITIAL_LOAD_COUNT个图标，每次加载INITIAL_LOAD_COUNT个
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD_COUNT);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 当搜索结果变化时，重置可见数量
  const prevResultsRef = useRef(results);
  useEffect(() => {
    if (prevResultsRef.current !== results) {
      setVisibleCount(INITIAL_LOAD_COUNT);
      prevResultsRef.current = results;
    }
  }, [results]);

  // 实现无限滚动的回调函数
  const handleLoadMore = useCallback(() => {
    if (isLoading || visibleCount >= results.length) return;

    setIsLoading(true);
    // 模拟加载延迟
    setTimeout(() => {
      setVisibleCount((prevCount) => Math.min(prevCount + INITIAL_LOAD_COUNT, results.length));
      setIsLoading(false);
    }, 500);
  }, [isLoading, visibleCount, results.length]);

  // 设置交叉观察器，监测加载更多按钮的可见性
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < results.length) {
          handleLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    const currentLoadMoreRef = loadMoreRef.current;
    if (currentLoadMoreRef) {
      observer.observe(currentLoadMoreRef);
    }

    return () => {
      if (currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
    };
  }, [visibleCount, results.length, handleLoadMore]);

  // 只显示当前可见的结果
  const visibleResults = results.slice(0, visibleCount);

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p>No icons found. Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={`grid pt-1 ${
        isCompact 
          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2" 
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      }`}>
        {visibleResults.map((result) => {
          const isSelected = selectedIds.has(result.icon.id);
          
          return (
            <Card
              key={result.icon.id}
              onClick={() => {
                if (selectionMode && onToggleSelect) {
                  onToggleSelect(result);
                } else {
                  onIconClick(result);
                }
              }}
              className={`group cursor-pointer transition-all py-0 
                ${isSelected 
                  ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                  : "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"}
              `}
            >
              <CardContent className={`flex flex-col items-center justify-center relative ${isCompact ? "p-2 h-20" : "p-4 h-28"}`}>
                {selectionMode && (
                  <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={isSelected} 
                      onCheckedChange={() => onToggleSelect && onToggleSelect(result)}
                    />
                  </div>
                )}
                <div className="text-gray-700 dark:text-gray-200 group-hover:scale-110 transition-transform">
                  <Icon icon={`${result.icon.library}:${result.icon.name}`} width={isCompact ? 28 : 32} height={isCompact ? 28 : 32} />
                </div>
                <p className={`mt-2 text-gray-500 dark:text-gray-400 text-center truncate w-full ${isCompact ? "text-[10px]" : "text-xs"}`}>
                  {result.icon.name}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 加载更多指示器 */}
      {visibleCount < results.length && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-8"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin dark:border-gray-600 dark:border-t-blue-400"></div>
              <span>Loading more icons...</span>
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">
              Scroll down to load more icons ({visibleCount}/{results.length})
            </div>
          )}
        </div>
      )}

      {/* 如果已经加载了所有图标，显示完成信息 */}
      {visibleCount >= results.length && results.length > 0 && (
        <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <span>All {results.length} icons loaded</span>
        </div>
      )}
    </div>
  );
};

export default IconGrid;
