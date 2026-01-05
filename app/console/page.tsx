"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { Icon, SearchResult } from "@/types/icon";
import IconGrid from "@/app/components/IconGrid";
import IconPreview from "@/app/components/IconPreview";
import SearchBar from "@/app/components/SearchBar";
import { getIconLibraries, loadIcons } from "@/services/icons";
import { iconSearchService } from "@/services/IconSearchService";
import { embeddingService } from "@/services/embedding";
import { INITIAL_LOAD_COUNT } from "@/constants";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type LibraryInfo = {
  prefix: string;
  name: string;
  total: number;
  author: string;
  license: string;
};

const ConsolePage: React.FC = () => {
  const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<string>("");
  const [isLoadingLibraries, setIsLoadingLibraries] = useState<boolean>(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>("");

  // Search tab
  const [query, setQuery] = useState<string>("");
  const [useVectorSearch, setUseVectorSearch] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Vectorize tab
  const [iconResults, setIconResults] = useState<SearchResult[]>([]);
  const [isLoadingIcons, setIsLoadingIcons] = useState<boolean>(false);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIconIds, setSelectedIconIds] = useState<Set<string>>(new Set());
  const [selectedIcon, setSelectedIcon] = useState<Icon | null>(null);
  const [isBatchEmbedding, setIsBatchEmbedding] = useState<boolean>(false);

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
      }
    };
    loadLibraryIcons();
  }, [activeLibrary, activeTab]);

  const handleSearch = async (q: string) => {
    if (!activeLibrary) return;
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
        const api = `https://api.iconify.design/search?query=${encodeURIComponent(
          q
        )}&prefix=${activeLibrary}&limit=${INITIAL_LOAD_COUNT}&pretty=1`;
        const resp = await fetch(api);
        const data = await resp.json();
        const icons: string[] = Array.isArray(data.icons) ? data.icons : [];
        const filtered = icons.filter((i) => i.startsWith(`${activeLibrary}:`));
        const mapped: SearchResult[] = filtered.map((full) => {
          const [prefix, name] = full.split(":");
          const tags = name.includes("-") ? name.split("-") : [name];
          const icon: Icon = {
            id: `${prefix}__${name}`,
            name,
            svg: "",
            library: prefix,
            category: "",
            tags,
            synonyms: [],
          };
          return { icon, score: 0 };
        });
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
      await embeddingService.initialize();
      const items: { icon: Icon; embedding: number[] }[] = [];
      for (const r of iconResults) {
        if (!selectedIconIds.has(r.icon.id)) continue;
        const icon = r.icon;
        const document = `${icon.name} ${icon.tags.join(" ")} ${icon.synonyms.join(" ")}`;
        try {
          const embedding = await embeddingService.generateEmbedding(document);
          items.push({ icon, embedding });
        } catch {}
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
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-muted/10 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">图标库</h2>
            <p className="text-sm text-muted-foreground">选择一个库进行操作</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索图标库..."
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
                  onClick={() => setActiveLibrary(lib.prefix)}
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
                未找到相关图标库
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
                  当前库：{activeLibraryInfo.name} ({activeLibraryInfo.total} icons)
                </p>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 pb-4">
            <TabsList>
              <TabsTrigger value="search">搜索</TabsTrigger>
              <TabsTrigger value="vectorize">向量化操作</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="flex-1 overflow-hidden flex flex-col pt-4 data-[state=inactive]:hidden">
            <div className="flex items-center gap-4 mb-6 px-6">
              <div className="flex-1">
                <SearchBar
                  onSearch={handleSearch}
                  placeholder={`在 ${activeLibrary || "库"} 中搜索...`}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vector-search"
                  checked={useVectorSearch}
                  onCheckedChange={(checked) => setUseVectorSearch(checked as boolean)}
                />
                <Label htmlFor="vector-search">向量化搜索 (Chroma)</Label>
              </div>
            </div>
            
            <ScrollArea className="flex-1 overflow-auto">
              {isSearching ? (
                 <div className="flex items-center justify-center py-8">
                   <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 </div>
              ) : (
                <div className="px-4">
                   <IconGrid
                    results={searchResults}
                    onIconClick={() => {}}
                  />
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="vectorize" className="flex-1 overflow-hidden flex flex-col pt-4 data-[state=inactive]:hidden">
            <div className="flex items-center justify-between mb-6 px-6">
              <div className="flex items-center gap-3">
                <Button
                  variant={isSelectionMode ? "secondary" : "outline"}
                  onClick={handleToggleSelectionMode}
                >
                  批量选择
                </Button>
                {isSelectionMode && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      已选 {selectedIconIds.size}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={handleSelectAll}
                    >
                      {selectedIconIds.size === iconResults.length ? "取消全选" : "全选"}
                    </Button>
                  </>
                )}
              </div>
              <Button
                onClick={handleBatchEmbedding}
                disabled={selectedIconIds.size === 0 || isBatchEmbedding}
              >
                {isBatchEmbedding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isBatchEmbedding ? "Embedding..." : "开始 Embedding"}
              </Button>
            </div>

            <ScrollArea className="flex-1 overflow-auto">
              {isLoadingIcons ? (
                 <div className="space-y-4 p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-lg" />
                      ))}
                    </div>
                 </div>
              ) : (
                <div className="px-6">
                  <IconGrid
                    results={iconResults}
                    onIconClick={(r) => setSelectedIcon(r.icon)}
                    selectionMode={isSelectionMode}
                    selectedIds={selectedIconIds}
                    onToggleSelect={handleToggleSelect}
                  />
                </div>
              )}
            </ScrollArea>
            <IconPreview icon={selectedIcon} onClose={() => setSelectedIcon(null)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ConsolePage;