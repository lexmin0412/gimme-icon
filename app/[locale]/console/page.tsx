"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { Icon, SearchResult } from "@/types/icon";
import IconGrid from "@/app/components/IconGrid";
import IconPreview from "@/app/components/IconPreview";
import SearchBar from "@/app/components/SearchBar";
import { getIconLibraries, loadIcons } from "@/services/icons";
import { iconSearchService } from "@/services/IconSearchService";
import { embeddingService } from "@/services/embedding";
import { APP_DESCRIPTION, APP_NAME, INITIAL_LOAD_COUNT } from "@/constants";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Icon as IconifyIcon } from "@iconify/react";
import { signIn } from "@/libs/auth-client";
import { iconifySearch, iconifyToInternalIcon } from "@/libs/iconify";
import { useTranslations } from "next-intl";

type LibraryInfo = {
  prefix: string;
  name: string;
  total: number;
  author: string;
  license: string;
};

const ConsolePage: React.FC = () => {
  const tConsole = useTranslations("Console");
  const tHeader = useTranslations("Header");
  const [authState, setAuthState] = useState<
    "checking" | "allowed" | "denied" | "unauthenticated"
  >("checking");
  const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<string>("");
  const [isLoadingLibraries, setIsLoadingLibraries] = useState<boolean>(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>("");

  const [useVectorSearch, setUseVectorSearch] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Vectorize tab
  const [iconResults, setIconResults] = useState<SearchResult[]>([]);
  const [isLoadingIcons, setIsLoadingIcons] = useState<boolean>(false);
  const [hasLoadedIcons, setHasLoadedIcons] = useState<boolean>(false);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIconIds, setSelectedIconIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedIcon, setSelectedIcon] = useState<Icon | null>(null);
  const [isBatchEmbedding, setIsBatchEmbedding] = useState<boolean>(false);
  const [embeddingProgress, setEmbeddingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<string>("search");

  const activeLibraryInfo = useMemo(
    () => libraries.find((l) => l.prefix === activeLibrary),
    [libraries, activeLibrary]
  );

  const filteredLibraries = useMemo(() => {
    if (!librarySearchQuery) return libraries;
    const lower = librarySearchQuery.toLowerCase();
    return libraries.filter(
      (lib) =>
        lib.name.toLowerCase().includes(lower) ||
        lib.prefix.toLowerCase().includes(lower)
    );
  }, [libraries, librarySearchQuery]);

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const res = await fetch("/api/console-auth");
        if (res.status === 401) {
          setAuthState("unauthenticated");
          return;
        }
        if (!res.ok) {
          setAuthState("denied");
          return;
        }
        const data = await res.json();
        setAuthState(data.allowed ? "allowed" : "denied");
      } catch {
        setAuthState("denied");
      }
    };
    verifyAccess();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoadingLibraries(true);
        const libs = await getIconLibraries();
        setLibraries(libs);
        const defaultLib = libs[0]?.prefix || "tabler";
        setActiveLibrary(defaultLib);
      } finally {
        setIsLoadingLibraries(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const initEmbedding = async () => {
      try {
        await embeddingService.initialize();
      } catch {}
    };
    initEmbedding();
  }, []);

  useEffect(() => {
    const loadLibraryIcons = async () => {
      if (!activeLibrary || activeTab !== "vectorize") return;
      try {
        setIsLoadingIcons(true);
        const icons = await loadIcons([activeLibrary]);
        const results: SearchResult[] = icons.map((icon) => ({
          icon,
          score: 0,
        }));
        setIconResults(results);
      } finally {
        setIsLoadingIcons(false);
        setHasLoadedIcons(true);
      }
    };
    loadLibraryIcons();
  }, [activeLibrary, activeTab]);

  const handleSearch = async (q: string) => {
    if (!activeLibrary) return;
    setHasSearched(true);
    try {
      setIsSearching(true);
      if (useVectorSearch) {
        const results = await iconSearchService.searchIcons(q, {
          libraries: [activeLibrary],
          categories: [],
          tags: [],
        });
        setSearchResults(results);
      } else {
        const { icons } = await iconifySearch({
          query: q,
          prefix: activeLibrary,
          limit: INITIAL_LOAD_COUNT,
        });
        const mapped: SearchResult[] = icons.map(({ prefix, name }) => ({
          icon: iconifyToInternalIcon(prefix, name),
          score: 0,
        }));
        setSearchResults(mapped);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((prev) => !prev);
    setSelectedIconIds(new Set());
  };

  const handleToggleSelect = (result: SearchResult) => {
    const next = new Set(selectedIconIds);
    if (next.has(result.icon.id)) {
      next.delete(result.icon.id);
    } else {
      next.add(result.icon.id);
    }
    setSelectedIconIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIconIds.size === iconResults.length) {
      setSelectedIconIds(new Set());
    } else {
      setSelectedIconIds(new Set(iconResults.map((r) => r.icon.id)));
    }
  };

  const handleBatchEmbedding = async () => {
    if (selectedIconIds.size === 0) return;
    try {
      setIsBatchEmbedding(true);
      // 1. 初始化进度
      setEmbeddingProgress({ current: 0, total: selectedIconIds.size });
      await embeddingService.initialize();
      const items: { icon: Icon; embedding: number[] }[] = [];
      let processedCount = 0; // 2. 添加计数器
      for (const r of iconResults) {
        if (!selectedIconIds.has(r.icon.id)) continue;
        const icon = r.icon;
        const document = `${icon.name} ${icon.tags.join(
          " "
        )} ${icon.synonyms.join(" ")}`;
        try {
          const embedding = await embeddingService.generateEmbedding(document);
          items.push({ icon, embedding });
        } catch {}
        // 3. 实时更新进度
        processedCount++;
        setEmbeddingProgress({
          current: processedCount,
          total: selectedIconIds.size,
        });
      }
      if (items.length > 0) {
        const response = await fetch("/api/refresh-embedding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!response.ok) {
          throw new Error("Failed to refresh embeddings");
        }
      }
      setIsSelectionMode(false);
      setSelectedIconIds(new Set());
    } finally {
      setIsBatchEmbedding(false);
      setEmbeddingProgress(null);
    }
  };

  if (authState === "checking") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        {tConsole("verifyingAccess")}
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {tConsole("notLoggedIn")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tConsole("pleaseLogin")}
          </p>
          <div>
            <Button
              onClick={() => {
                signIn();
              }}
            >
              {tConsole("loginWithGithub")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-3 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {tConsole("accessDenied")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tConsole("noPermissionDetail")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-muted/10 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 shrink-0">
              <Image src="/icon.svg" alt="App Icon" width={28} height={28} />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
                {APP_NAME}
              </h1>
            </div>
            <div className="shrink-0">
              <a
                href="https://github.com/lexmin0412/gimme-icon-next"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                aria-label={tHeader("githubRepo")}
              >
                <IconifyIcon icon="lucide:github" className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                isLoadingLibraries
                  ? tConsole("initializing")
                  : tConsole("searchLibrariesPlaceholder")
              }
              value={librarySearchQuery}
              onChange={(e) => setLibrarySearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-2 space-y-1">
            {isLoadingLibraries ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              filteredLibraries.map((lib) => (
                <Button
                  key={lib.prefix}
                  variant={activeLibrary === lib.prefix ? "secondary" : "ghost"}
                  className="w-full justify-between font-normal"
                  onClick={() => {
                    setActiveLibrary(lib.prefix);
                    setHasLoadedIcons(false);
                  }}
                >
                  <span className="truncate">{lib.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {lib.total}
                  </Badge>
                </Button>
              ))
            )}
            {!isLoadingLibraries && filteredLibraries.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {tConsole("noLibrariesFound")}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 py-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              {activeLibraryInfo && (
                <p className="text-muted-foreground">
                  {tConsole("currentLibrarySummary", {
                    name: activeLibraryInfo.name,
                    total: activeLibraryInfo.total,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between border-b px-6 pb-4">
            <TabsList>
              <TabsTrigger value="vectorize">
                {tConsole("vectorizeTab")}
              </TabsTrigger>
              <TabsTrigger value="search">
                {tConsole("searchTab")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="search"
            className="flex-1 overflow-hidden flex flex-col pt-4 data-[state=inactive]:hidden"
          >
            <div className="flex items-center gap-4 mb-6 px-6">
              <div className="flex-1">
                <SearchBar
                  onSearch={handleSearch}
                  placeholder={tConsole("searchInLibrary", {
                    library: activeLibrary || tConsole("defaultLibrary"),
                  })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vector-search"
                  checked={useVectorSearch}
                  onCheckedChange={(checked) =>
                    setUseVectorSearch(checked as boolean)
                  }
                />
                <Label htmlFor="vector-search">
                  {tConsole("semanticSearchLabel")}
                </Label>
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-auto">
              <div className="px-4">
                {hasSearched ? (
                  <IconGrid
                    results={searchResults}
                    onIconClick={() => {}}
                    loading={isSearching}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    {tConsole("enterKeywordToSearch")}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="vectorize"
            className="flex-1 overflow-hidden flex flex-col pt-4 data-[state=inactive]:hidden"
          >
            <div className="flex items-center justify-between mb-6 px-6">
              <div className="flex items-center gap-3">
                <Button
                  variant={isSelectionMode ? "secondary" : "outline"}
                  onClick={handleToggleSelectionMode}
                >
                  {tConsole("batchSelect")}
                </Button>
                {isSelectionMode && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {tConsole("selectedCount", {
                        count: selectedIconIds.size,
                      })}
                    </span>
                    <Button variant="ghost" onClick={handleSelectAll}>
                      {selectedIconIds.size === iconResults.length
                        ? tConsole("deselectAll")
                        : tConsole("selectAll")}
                    </Button>
                  </>
                )}
              </div>
              <Button
                onClick={handleBatchEmbedding}
                disabled={selectedIconIds.size === 0 || isBatchEmbedding}
              >
                {isBatchEmbedding && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isBatchEmbedding
                  ? embeddingProgress
                    ? tConsole("embeddingWithProgress", {
                        current: embeddingProgress.current,
                        total: embeddingProgress.total,
                      })
                    : tConsole("embeddingInProgress")
                  : tConsole("startEmbedding")}
              </Button>
            </div>

            <ScrollArea className="flex-1 overflow-auto">
              <div className="px-6">
                <IconGrid
                  results={iconResults}
                  onIconClick={(r) => setSelectedIcon(r.icon)}
                  selectionMode={isSelectionMode}
                  selectedIds={selectedIconIds}
                  onToggleSelect={handleToggleSelect}
                  loading={isLoadingIcons || !hasLoadedIcons}
                />
              </div>
            </ScrollArea>
            <IconPreview
              icon={selectedIcon}
              onClose={() => setSelectedIcon(null)}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ConsolePage;
