"use client";
import { authClient, signIn, signOut } from "@/libs/auth-client";
import React, { useState, useEffect, useContext, useRef } from "react";
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
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { ProjectSettingsDialog } from "./components/ProjectSettings";

interface HeaderProps {
  showSearchBar: boolean;
  onSearch: (query: string) => void;
  query?: string;
  user: { name?: string; image?: string | null } | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Header: React.FC<HeaderProps> = ({
  showSearchBar,
  onSearch,
  query,
  user,
  signIn,
  signOut,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="shrink-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* 左侧 Logo 和 标题 */}
        <div className="flex items-center gap-2 shrink-0">
          <Image src="/icon.svg" alt="App Icon" width={28} height={28} />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
            {APP_NAME}
          </h1>
        </div>

        {/* 中间搜索框 - 仅在 showSearchBar 为 true 时显示 */}
        <div className="flex-1 max-w-2xl">
          {showSearchBar && (
            <SearchBar onSearch={onSearch} defaultValue={query} />
          )}
        </div>

        {/* 右侧 GitHub 链接和用户信息 */}
        <div className="shrink-0 flex items-center gap-4">
          {user ? (
            <div className="relative" ref={menuRef}>
              <div
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.image && (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                    <Image
                      src={user.image}
                      alt={user.name || "User"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              {/* 下拉菜单 */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  >
                    <Icon icon="lucide:log-out" className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={signIn} variant="ghost" size="sm">
              Login
            </Button>
          )}
          <ProjectSettingsDialog />
          <a
            href="https://github.com/lexmin0412/gimme-icon-next"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="GitHub Repository"
          >
            <Icon icon="lucide:github" className="w-6 h-6" />
          </a>
        </div>
      </div>
    </div>
  );
};

// 创建一个使用SearchContext的内部组件
const HomeContent: React.FC<{ isAppLoading: boolean }> = ({ isAppLoading }) => {
  const context = useContext(SearchContext);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [user, setUser] = useState<{
    name?: string;
    image?: string | null;
  } | null>(null);
  const { showToast } = useToast();

  // 加载图标库列表

  // 处理搜索查询
  const handleSearch = async (query: string) => {
    if (isAppLoading) return;
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

  // 包装 signIn 函数
  const handleSignIn = async () => {
    await signIn();
  };

  // 处理退出登录
  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      showToast("已退出登录", "success");
    } catch (error) {
      console.error("退出登录失败:", error);
      showToast("退出登录失败", "error");
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          // 已登录，可能需要更新 UI 或执行其他操作
          console.log("session", data);
          setUser(data.user);
          showToast("已登录", "success");
        } else {
          // 未登录，可能需要显示登录按钮或其他提示
          setUser(null);
          // showToast("请登录以使用更多功能", "info");
        }
      } catch (error) {
        console.error("检查会话失败:", error);
        // 处理错误，例如显示错误提示
      }
    };
    checkSession();
  }, []);

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
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
      {/* 顶部 Header - 始终显示 */}
      <Header
        showSearchBar={hasSearched}
        onSearch={handleSearch}
        query={context?.query}
        user={user}
        signIn={handleSignIn}
        signOut={handleSignOut}
      />

      {!hasSearched ? (
        // 初始化状态：完全居中，只保留搜索框
        <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
          <h3 className="text-center text-2xl font-bold">
            Welcome to {APP_NAME}
          </h3>
          <div className="text-gray-600 dark:text-gray-400 text-center mt-2">
            {APP_DESCRIPTION}
          </div>
          <div className="w-full max-w-2xl mt-6">
            <SearchBar
              onSearch={handleSearch}
              defaultValue={context?.query}
              placeholder={isAppLoading ? "Initializing..." : APP_DESCRIPTION}
              disabled={isAppLoading}
              showButton={false}
              multiline
            />
          </div>
        </div>
      ) : (
        // 搜索后的状态
        <>
          {/* 页面主内容区域 */}
          <div className="flex-1 overflow-hidden">
            <div className="container mx-auto px-4 h-full py-4">
              <div
                className={`flex flex-col lg:flex-row h-full transition-all duration-300 ${
                  isSelected ? "gap-4" : "gap-8"
                }`}
              >
                {/* 左侧列表区域 */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-y-auto ${
                    isSelected
                      ? "lg:w-7/12 w-full h-1/2 lg:h-full"
                      : "w-full h-full"
                  }`}
                >
                  <IconGrid
                    results={context?.results || []}
                    onIconClick={handleIconClick}
                    isCompact={isSelected}
                    loading={isLoading}
                  />
                </div>

                {/* 右侧详情区域 */}
                {context.selectedIcon && (
                  <div className="lg:w-5/12 w-full h-1/2 lg:h-full overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <IconDetail
                      icon={context.selectedIcon}
                      onClose={handleClosePreview}
                      showCloseButton={true}
                    />
                  </div>
                )}
              </div>
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

  return (
    <SearchProvider>
      <HomeContent isAppLoading={isAppLoading} />
    </SearchProvider>
  );
};

export default Home;
