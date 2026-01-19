"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { ProjectSettingsDialog } from "./ProjectSettings";
import { APP_NAME } from "@/constants";
import SearchBar from "./SearchBar";
import { ModeToggle } from "./ModeToggle";

interface HeaderProps {
  showSearchBar: boolean;
  onSearch: (query: string) => void;
  query?: string;
  user: { name?: string; image?: string | null } | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  showSearchBar,
  onSearch,
  query,
  user,
  signIn,
  signOut,
  transparent = false,
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
    <div 
      className={`shrink-0 z-50 transition-colors duration-300 ${
        transparent 
          ? "fixed top-0 left-0 right-0 bg-transparent border-transparent" 
          : "bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* 左侧 Logo 和 标题 */}
        <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
          <Image src="/icon.svg" alt="App Icon" width={28} height={28} />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
            {APP_NAME}
          </h1>
        </Link>

        {/* 中间搜索框 - 仅在 showSearchBar 为 true 时显示 */}
        <div className="flex-1 max-w-2xl">
          {showSearchBar && (
            <SearchBar onSearch={onSearch} defaultValue={query} />
          )}
        </div>

        {/* 右侧 GitHub 链接和用户信息 */}
        <div className="shrink-0 flex items-center gap-4">
          <ModeToggle />
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
