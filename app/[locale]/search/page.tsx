"use client";
import React, { useState, useEffect, useContext, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { authClient, signIn, signOut } from "@/libs/auth-client";
import IconGrid from "@/app/components/IconGrid";
import IconDetail from "@/app/components/IconDetail";
import { Header } from "@/app/components/Header";
import { iconSearchService } from "@/services/IconSearchService";
import type { SearchResult } from "@/types/icon";
import { SearchProvider, SearchContext } from "@/context/SearchContext";
import { embeddingService } from "@/services/embedding";
import { useToast } from "@/app/components/ToastProvider";
import { useTranslations } from "next-intl";

const SearchContent: React.FC = () => {
  const t = useTranslations("Search");
  const tCommon = useTranslations("Common");
  const context = useContext(SearchContext);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{
    name?: string;
    image?: string | null;
  } | null>(null);
  const { showToast } = useToast();

  // Perform actual search
  const performSearch = useCallback(async (query: string) => {
    if (!context) return;
    
    context.setQuery(query);
    try {
      setIsLoading(true);
      const results = await iconSearchService.searchIcons(
        query,
        context.filters || { libraries: [], categories: [], tags: [] }
      );
      context.setResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      showToast(t("searchFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [context?.filters, context?.setQuery, context?.setResults, showToast]);

  // Initial search from URL and listen to URL changes
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      performSearch(query);
    }
  }, [searchParams, performSearch]);

  // Handle search query (UI interaction)
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      showToast(t("enterKeyword"), "error");
      return;
    }
    
    const currentQuery = searchParams.get("q");
    if (currentQuery !== query) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("q", query);
      router.push(`/search?${newParams.toString()}`);
    } else {
      // Force refresh if query is same
      performSearch(query);
    }
  };

  // Handle icon click
  const handleIconClick = (result: SearchResult) => {
    context?.setSelectedIcon(result.icon);
  };

  // Close icon preview
  const handleClosePreview = () => {
    context?.setSelectedIcon(null);
  };

  // Auth handlers
  const handleSignIn = async () => {
    await signIn();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      showToast(tCommon("signedOut"), "success");
    } catch (error) {
      console.error("Sign out failed:", error);
      showToast(tCommon("signOutFailed"), "error");
    }
  };

  // Check auth session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };
    checkSession();
  }, []);

  if (!context) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("contextUnavailable")}</p>
      </div>
    );
  }

  const isSelected = !!context.selectedIcon;

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
      <Header
        showSearchBar={true}
        onSearch={handleSearch}
        query={context?.query || searchParams.get("q") || ""}
        user={user}
        signIn={handleSignIn}
        signOut={handleSignOut}
      />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        ) : context?.results && context.results.length > 0 ? (
          <div className="flex-1 overflow-hidden h-full">
            <div className="container mx-auto px-4 h-full py-4">
              <div
                className={`flex flex-col lg:flex-row h-full transition-all duration-300 ${
                  context.selectedIcon ? "gap-4" : "gap-8"
                }`}
              >
                {/* Left Grid Area */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-y-auto ${
                    context.selectedIcon
                      ? "lg:w-7/12 w-full h-1/2 lg:h-full"
                      : "w-full h-full"
                  }`}
                >
                  <IconGrid
                    results={context.results}
                    onIconClick={handleIconClick}
                    isCompact={!!context.selectedIcon}
                    loading={isLoading}
                  />
                </div>

                {/* Right Detail Area */}
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
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">{t('noResults')}</p>
          </div>
        )}
      </main>
    </div>
  );
};

const SearchPage: React.FC = () => {
  const t = useTranslations("Search");
  // Initialize services if needed (might be redundant if already initialized in layout or root, 
  // but good to ensure availability)
  useEffect(() => {
    const init = async () => {
      try {
        await embeddingService.initialize();
        await iconSearchService.switchVectorStore({ type: "cloud-chroma" });
        await iconSearchService.initialize(false);
      } catch (error) {
        console.error("Service initialization failed:", error);
      }
    };
    init();
  }, []);

  return (
    <SearchProvider>
      <React.Suspense
        fallback={
          <div className="flex h-screen items-center justify-center text-muted-foreground">
            {t("loading")}
          </div>
        }
      >
        <SearchContent />
      </React.Suspense>
    </SearchProvider>
  );
};

export default SearchPage;
