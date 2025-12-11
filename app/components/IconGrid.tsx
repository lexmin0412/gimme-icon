"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { SearchResult } from "@/types/icon";
import { Icon } from "@iconify/react";

interface IconGridProps {
  results: SearchResult[];
  onIconClick: (result: SearchResult) => void;
}

const IconGrid: React.FC<IconGridProps> = ({ results, onIconClick }) => {
  // 首屏加载50个图标，每次加载50个
  const [visibleCount, setVisibleCount] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 当搜索结果变化时，重置可见数量
  const prevResultsRef = useRef(results);
  useEffect(() => {
    if (prevResultsRef.current !== results) {
      setVisibleCount(50);
      prevResultsRef.current = results;
    }
  }, [results]);

  // 实现无限滚动的回调函数
  const handleLoadMore = useCallback(() => {
    if (isLoading || visibleCount >= results.length) return;

    setIsLoading(true);
    // 模拟加载延迟
    setTimeout(() => {
      setVisibleCount((prevCount) => Math.min(prevCount + 50, results.length));
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

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visibleResults.map((result) => (
          <div
            key={result.icon.id}
            onClick={() => onIconClick(result)}
            className="group p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-600"
          >
            <div className="flex items-center justify-center h-20 mb-3">
              <Icon icon={`${result.icon.library}:${result.icon.name}`} width={36} height={36} />
            </div>
            <h3 className="text-xs font-medium text-center text-gray-900 truncate dark:text-white">
              {result.icon.name}
            </h3>
            <p className="text-xs text-center text-gray-500 truncate dark:text-gray-400">
              {result.icon.library}
            </p>
          </div>
        ))}
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
