"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { ProjectSettingsDialog } from "./ProjectSettings";
import { APP_NAME } from "@/constants";
import SearchBar from "./SearchBar";
import { ModeToggle } from "./ModeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "next-intl";
import { FilterOptions } from "@/types/icon";

interface HeaderProps {
  showSearchBar: boolean;
  onSearch: (query: string, filters?: FilterOptions) => void;
  query?: string;
  filters?: FilterOptions;
  user: { name?: string; image?: string | null } | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  transparent?: boolean;
  fullWidth?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  showSearchBar,
  onSearch,
  query,
  filters,
  user,
  signIn,
  signOut,
  transparent = false,
  fullWidth = false,
}) => {
  const t = useTranslations('Header');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hasConsoleAccess, setHasConsoleAccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check console access
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasConsoleAccess(false);
        return;
      }
      try {
        const res = await fetch("/api/console-auth");
        if (res.ok) {
          const data = await res.json();
          setHasConsoleAccess(data.allowed);
        } else {
          setHasConsoleAccess(false);
        }
      } catch (error) {
        console.error("Failed to check console access:", error);
        setHasConsoleAccess(false);
      }
    };
    checkAccess();
  }, [user]);

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
      <div className={`${fullWidth ? "w-full px-6" : "container mx-auto px-4"} h-16 flex items-center justify-between gap-4`}>
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
            <SearchBar onSearch={onSearch} defaultValue={query} filters={filters} />
          )}
        </div>

        {/* 右侧 GitHub 链接和用户信息 */}
        <div className="shrink-0 flex items-center gap-1">
          <LanguageSwitcher />

          <ModeToggle />

          <ProjectSettingsDialog />
          
          <Button variant="ghost" size="icon" asChild>
            <a
              href="https://github.com/lexmin0412/gimme-icon-next"
              target="_blank"
              rel="noopener noreferrer"
              title={t('githubRepo')}
            >
              <Icon icon="lucide:github" className="h-[1.2rem] w-[1.2rem]" />
            </a>
          </Button>

          {hasConsoleAccess && (
            <Button variant="ghost" size="icon" asChild>
              <Link href="/console" title={t('console') || "Console"}>
                <Icon icon="lucide:terminal" className="h-[1.2rem] w-[1.2rem]" />
              </Link>
            </Button>
          )}

          <div className="ml-1">
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
                    {t('signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={signIn} variant="ghost" size="sm">
              {t('login')}
            </Button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
