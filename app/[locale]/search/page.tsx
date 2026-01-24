"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { authClient, signIn, signOut } from "@/libs/auth-client";
import IconGrid from "@/app/components/IconGrid";
import IconDetail from "@/app/components/IconDetail";
import { Header } from "@/app/components/Header";
import { iconSearchService } from "@/services/IconSearchService";
import type { SearchResult, Icon } from "@/types/icon";
import { embeddingService } from "@/services/embedding";
import { useToast } from "@/app/components/ToastProvider";
import { useTranslations } from "next-intl";
import { FilterOptions } from "@/types/icon";

const SearchContent: React.FC = () => {
  const t = useTranslations("Search");
  const tCommon = useTranslations("Common");
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<Icon | null>(null);
  
  const [user, setUser] = useState<{
    name?: string;
    image?: string | null;
  } | null>(null);
  const { showToast } = useToast();
  const lastSearchParamsRef = React.useRef<string>("");

  // Perform actual search
  const performSearch = useCallback(async (query: string, filters: FilterOptions) => {
    try {
      setIsLoading(true);
      const results = await iconSearchService.searchIcons(
        query,
        filters
      );
      setResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      showToast(t("searchFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  // Initial search from URL and listen to URL changes
  useEffect(() => {
    const query = searchParams.get("q");
    const libraries = searchParams.get("libraries")?.split(",").filter(Boolean) || [];
    
    // Create a stable string representation of the current search params we care about
    const currentParamsString = new URLSearchParams({
        q: query || "",
        libraries: libraries.sort().join(",")
    }).toString();

    // Only search if query exists and params have changed since last search
    if (query && currentParamsString !== lastSearchParamsRef.current) {
      lastSearchParamsRef.current = currentParamsString;
      performSearch(query, { libraries, categories: [], tags: [] });
    }
  }, [searchParams, performSearch]);

  // Handle search query (UI interaction) -> URL update
  const handleSearch = (query: string, filters?: FilterOptions) => {
    if (!query.trim()) {
      showToast(t("enterKeyword"), "error");
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", query);
    if (filters?.libraries?.length) {
      params.set("libraries", filters.libraries.join(","));
    } else {
      params.delete("libraries");
    }
    
    const newSearchString = params.toString();
    if (searchParams.toString() !== newSearchString) {
      router.push(`/search?${newSearchString}`);
    } else {
      // Force refresh if query/params are same but user explicitly hit search
      // We can reset the ref to force a re-run in useEffect or call performSearch directly
      // Calling directly is simpler
      performSearch(query, filters || { libraries: [], categories: [], tags: [] });
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Sign in failed:", error);
      showToast(tCommon("signInFailed"), "error");
    }
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

  const isSelected = !!selectedIcon;
  const libraries = searchParams.get("libraries")?.split(",").filter(Boolean) || [];

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
      <Header
        showSearchBar={true}
        onSearch={handleSearch}
        query={searchParams.get("q") || ""}
        filters={{ libraries, categories: [], tags: [] }}
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
        ) : results.length > 0 ? (
          <div className="flex-1 overflow-hidden h-full">
            <div className="container mx-auto h-full py-4">
              <div
                className={`flex flex-col lg:flex-row h-full transition-all duration-300 ${
                  selectedIcon ? "gap-4" : "gap-8"
                }`}
              >
                {/* Left Grid Area */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-y-auto ${
                    selectedIcon
                      ? "lg:w-7/12 w-full h-1/2 lg:h-full"
                      : "w-full h-full"
                  }`}
                >
                  <IconGrid
                    results={results}
                    onIconClick={(result) => setSelectedIcon(result.icon)}
                    isCompact={!!selectedIcon}
                  />
                </div>

                {/* Right Detail Area */}
                {selectedIcon && (
                  <div className="lg:w-5/12 w-full h-1/2 lg:h-full overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <IconDetail
                      icon={selectedIcon}
                      onClose={() => setSelectedIcon(null)}
                      showCloseButton={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold mb-2">{t('noResults')}</h2>
            <p className="text-muted-foreground max-w-md">
              {t('tryAdjustingKeywords')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

const SearchPage: React.FC = () => {
  const t = useTranslations("Search");
  // Initialize services if needed
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
    <React.Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          {t("loading")}
        </div>
      }
    >
      <SearchContent />
    </React.Suspense>
  );
};

export default SearchPage;
