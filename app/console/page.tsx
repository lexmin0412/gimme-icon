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

  const [activeTab, setActiveTab] = useState<"search" | "vectorize">("search");

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

  const activeLibraryInfo = useMemo(
    () => libraries.find((l) => l.prefix === activeLibrary),
    [libraries, activeLibrary]
  );

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
    setQuery(q);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        <aside className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            图标库
          </h2>
          {isLoadingLibraries ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">加载中...</div>
          ) : (
            <div className="space-y-2">
              {libraries.map((lib) => (
                <button
                  key={lib.prefix}
                  onClick={() => setActiveLibrary(lib.prefix)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    activeLibrary === lib.prefix
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="truncate">{lib.name}</span>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                      {lib.total} icons
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1.5 text-sm rounded-md ${
                  activeTab === "search"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-800 dark:text-gray-200 text-gray-700"
                }`}
                onClick={() => setActiveTab("search")}
              >
                搜索
              </button>
              <button
                className={`px-3 py-1.5 text-sm rounded-md ${
                  activeTab === "vectorize"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-800 dark:text-gray-200 text-gray-700"
                }`}
                onClick={() => setActiveTab("vectorize")}
              >
                向量化操作
              </button>
            </div>
            {activeLibraryInfo && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                当前库：{activeLibraryInfo.name}（{activeLibraryInfo.total} icons）
              </div>
            )}
          </div>

          {activeTab === "search" && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <SearchBar
                    onSearch={handleSearch}
                    placeholder={`在 ${activeLibrary || "库"} 中搜索...`}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={useVectorSearch}
                    onChange={(e) => setUseVectorSearch(e.target.checked)}
                    className="rounded text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                  />
                  向量化搜索（Chroma）
                </label>
              </div>
              {isSearching && (
                <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  搜索中...
                </div>
              )}
              <IconGrid
                results={searchResults}
                onIconClick={() => {}}
              />
            </div>
          )}

          {activeTab === "vectorize" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleSelectionMode}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    批量选择
                  </button>
                  {isSelectionMode && (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        已选 {selectedIconIds.size}
                      </span>
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                      >
                        {selectedIconIds.size === iconResults.length ? "取消全选" : "全选"}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={handleBatchEmbedding}
                  disabled={selectedIconIds.size === 0 || isBatchEmbedding}
                  className={`px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors
                    ${
                      selectedIconIds.size === 0 || isBatchEmbedding
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {isBatchEmbedding ? "Embedding..." : "开始 Embedding"}
                </button>
              </div>
              {isLoadingIcons ? (
                <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  加载图标中...
                </div>
              ) : null}
              <IconGrid
                results={iconResults}
                onIconClick={(r) => setSelectedIcon(r.icon)}
                selectionMode={isSelectionMode}
                selectedIds={selectedIconIds}
                onToggleSelect={handleToggleSelect}
              />
              <IconPreview icon={selectedIcon} onClose={() => setSelectedIcon(null)} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ConsolePage;

