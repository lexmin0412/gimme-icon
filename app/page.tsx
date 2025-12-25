"use client";
import React, { useState, useEffect, useContext } from "react";
import SearchBar from "./components/SearchBar";
import IconGrid from "./components/IconGrid";
import IconPreview from "./components/IconPreview";
import TabButton from "./components/TabButton";
import {
  iconSearchService,
  getVectorStoreName,
} from "../services/IconSearchService";
import type { SearchResult, FilterOptions } from "../types/icon";
import { SearchProvider, SearchContext } from "../context/SearchContext";
import { embeddingService } from "../services/embedding";
import { APP_NAME, APP_DESCRIPTION } from "../constants";
import type { VectorStoreType, VectorStoreConfig } from "../services/vector-store-service";
import { AVAILABLE_MODELS, ModelId } from "../services/embedding";
import { useToast } from "./components/ToastProvider";
import { getIconLibraries, loadIcons } from "../services/icons";
import localforage from "localforage";
import { generateHash } from "../utils/hash";

// 创建一个使用SearchContext的内部组件
const HomeContent: React.FC = () => {
  const context = useContext(SearchContext);
  const [_isLoading, setIsLoading] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelId>(
    AVAILABLE_MODELS.MULTILINGUAL
  );
  const [isChangingModel, setIsChangingModel] = useState(false);
  const { showToast } = useToast();

  // 图标库相关状态
  const [iconLibraries, setIconLibraries] = useState<
    {
      prefix: string;
      name: string;
      total: number;
      author: string;
      license: string;
    }[]
  >([]);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([
    "lucide",
    "heroicons",
    "ant-design",
  ]);
  const [isLoadingLibraries, setIsLoadingLibraries] = useState(false);
  const [isUpdatingLibraries, setIsUpdatingLibraries] = useState(false);
  
  // 向量存储类型相关状态
  const [currentVectorStoreType, setCurrentVectorStoreType] = useState<VectorStoreType>("indexed-db");

  // 选项卡状态
  const [activeTab, setActiveTab] = useState<"vectorModel" | "iconLibraries" | "vectorStore">(
    "vectorModel"
  );

  const triggerFirstSearch = async () => {
    // 初始搜索（空查询，返回所有图标）
    const initialResults = await iconSearchService.searchIcons(
      "",
      context?.filters || { libraries: [], categories: [], tags: [] }
    );
    context?.setResults(initialResults);
  };

  // 初始化应用
  useEffect(() => {
    triggerFirstSearch();
    // 获取当前模型并更新状态
    const model = embeddingService.getCurrentModel();
    setCurrentModel(model);
    
    // 获取当前向量存储类型
    const savedVectorStoreType = localStorage.getItem("vectorStoreType") as VectorStoreType;
    if (savedVectorStoreType) {
      setCurrentVectorStoreType(savedVectorStoreType);
    }
  }, []);

  // 加载图标库列表
  useEffect(() => {
    loadIconLibraries();
  }, []);

  // 处理搜索查询
  const handleSearch = async (query: string) => {
    context?.setQuery(query);
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

  // 处理过滤器变化
  const handleFilterChange = async (newFilters: FilterOptions) => {
    context?.setFilters(newFilters);
    try {
      setIsLoading(true);
      // 重新搜索当前查询并应用新过滤器
      const results = await iconSearchService.searchIcons("", newFilters);
      context?.setResults(results);
    } catch (error) {
      console.error("Filter search failed:", error);
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

  // 加载图标库列表
  const loadIconLibraries = async () => {
    try {
      setIsLoadingLibraries(true);
      const libraries = await getIconLibraries();
      setIconLibraries(libraries);

      // 从本地存储获取用户之前选择的图标库
      const savedLibraries = localStorage.getItem("selectedIconLibraries");
      if (savedLibraries) {
        setSelectedLibraries(JSON.parse(savedLibraries));
      }
    } catch (error) {
      console.error("Failed to load icon libraries:", error);
      showToast("Failed to load icon libraries", "error");
    } finally {
      setIsLoadingLibraries(false);
    }
  };

  // 更新选中的图标库
  const handleUpdateLibraries = async () => {
    try {
      setIsUpdatingLibraries(true);

      // 保存用户选择的图标库到本地存储
      localStorage.setItem(
        "selectedIconLibraries",
        JSON.stringify(selectedLibraries)
      );

      // 检查是否需要重新生成向量
      // 首先加载图标数据
      const icons = await loadIcons(selectedLibraries);

      // 生成图标数据的哈希值
      const iconsJsonString = JSON.stringify(icons);
      const iconsHash = generateHash(iconsJsonString);

      // 获取当前模型ID
      const currentModel = embeddingService.getCurrentModel();

      // 使用统一的向量存储命名函数
      const vectorStoreName = getVectorStoreName(currentModel);

      // 检查IndexedDB中是否已有向量数据
      // const storedVectors = await localforage.getItem(vectorStoreName);
      await iconSearchService.reInitialize();

      // if (storedVectors && Array.isArray(storedVectors) && storedVectors.length > 0) {
      //   // 如果有缓存，直接初始化而不强制重新生成
      //   console.log(`Found cached vectors in IndexedDB: ${vectorStoreName}`);
      //   await iconSearchService.initialize(false);
      // } else {
      //   // 如果没有缓存，重新初始化并强制生成向量
      //   console.log(`No cached vectors found in IndexedDB, regenerating...`);
      //   await iconSearchService.reInitialize();
      // }

      // 刷新搜索结果
      await triggerFirstSearch();

      // 关闭设置弹窗
      setShowSettingsMenu(false);

      showToast("Icon libraries updated successfully!", "success");
    } catch (error) {
      console.error("Failed to update icon libraries:", error);
      showToast("Failed to update icon libraries", "error");
    } finally {
      setIsUpdatingLibraries(false);
    }
  };

  // 处理向量存储类型切换
  const handleVectorStoreChange = async (newType: VectorStoreType) => {
    try {
      let config: VectorStoreConfig;
      
      switch (newType) {
        case "indexed-db":
          config = { type: "indexed-db" };
          break;
        case "local-chroma":
          config = { 
            type: "local-chroma",
            collectionName: "Gimme-icons",
            persistDirectory: "./chromadb_data"
          };
          break;
        case "cloud-chroma":
          config = { 
            type: "cloud-chroma",
            collectionName: "Gimme-icons"
          };
          break;
        default:
          throw new Error(`Unsupported vector store type: ${newType}`);
      }

      // 切换向量存储
      await iconSearchService.switchVectorStore(config);
      setCurrentVectorStoreType(newType);
      
      // 保存到本地存储
      localStorage.setItem("vectorStoreType", newType);
      
      showToast("Vector store type changed successfully!", "success");
      
      // 重新初始化搜索
      await triggerFirstSearch();
      
      // 关闭设置弹窗
      setShowSettingsMenu(false);
    } catch (error) {
      console.error("Error switching vector store:", error);
      showToast("Failed to switch vector store type", "error");
    }
  };

  // 处理模型切换
  const handleModelChange = async (newModel: ModelId) => {
    setIsChangingModel(true);

    try {
      const success = await embeddingService.setModel(newModel);
      if (success) {
        setCurrentModel(newModel);

        // 检查是否需要重新生成向量
        // 获取用户选择的图标库
        let currentLibraries = selectedLibraries;
        const savedLibraries = localStorage.getItem("selectedIconLibraries");
        if (savedLibraries) {
          currentLibraries = JSON.parse(savedLibraries);
        }

        // 加载图标数据
        const icons = await loadIcons(currentLibraries);

        // 生成图标数据的哈希值
        const iconsJsonString = JSON.stringify(icons);
        const iconsHash = generateHash(iconsJsonString);

        // 使用统一的向量存储命名函数
        const vectorStoreName = getVectorStoreName(newModel);

        // 检查IndexedDB中是否已有向量数据
        const storedVectors = await localforage.getItem(vectorStoreName);

        if (
          storedVectors &&
          Array.isArray(storedVectors) &&
          storedVectors.length > 0
        ) {
          // 如果有缓存，直接初始化而不强制重新生成
          console.log(`Found cached vectors in IndexedDB: ${vectorStoreName}`);
          await iconSearchService.initialize(false);
        } else {
          // 如果没有缓存，重新初始化并强制生成向量
          console.log(`No cached vectors found in IndexedDB, regenerating...`);
          await iconSearchService.reInitialize();
        }

        // 刷新搜索结果
        await triggerFirstSearch();

        // 关闭设置弹窗
        setShowSettingsMenu(false);

        showToast("Model switched successfully!", "success");
      } else {
        showToast(
          "Failed to switch model. Falling back to text search.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error switching model:", error);
      showToast("An error occurred while switching model.", "error");
    } finally {
      setIsChangingModel(false);
    }
  };

  // 如果context不存在，显示错误信息
  if (!context) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Search context not available
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* GitHub链接和设置按钮 */}
        <div className="absolute top-4 right-4 flex items-center gap-4">
          {/* 模型切换设置 */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center"
              aria-label="Settings"
              disabled={isChangingModel}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            {/* 设置菜单 */}
            {showSettingsMenu && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[800px] max-w-3xl h-[70vh] overflow-hidden flex flex-col">
                  {/* 标题栏 */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Settings
                    </h2>
                    <button
                      onClick={() => setShowSettingsMenu(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* 内容区域 - 左右分栏 */}
                  <div className="flex flex-1 overflow-hidden">
                    {/* 左侧选项卡 */}
                    <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <TabButton
                        tab="vectorModel"
                        label="Vector Model"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                      />
                      <TabButton
                        tab="iconLibraries"
                        label="Icon Libraries"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                      />
                      <TabButton
                        tab="vectorStore"
                        label="Vector Store Type"
                        activeTab={activeTab}
                        onClick={setActiveTab}
                      />
                    </div>

                    {/* 右侧内容 */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* 向量模型选项卡内容 */}
                      {activeTab === "vectorModel" && (
                        <div>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                            Vector Model
                          </h3>
                          <div className="space-y-3">
                            <button
                              onClick={() =>
                                setCurrentModel(AVAILABLE_MODELS.ENGLISH)
                              }
                              className={`block w-full text-left px-4 py-2 text-sm ${
                                currentModel === AVAILABLE_MODELS.ENGLISH
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                              disabled={isChangingModel}
                            >
                              {currentModel === AVAILABLE_MODELS.ENGLISH && (
                                <svg
                                  className="inline-block w-4 h-4 mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              English (all-MiniLM-L6-v2)
                            </button>
                            <button
                              onClick={() =>
                                setCurrentModel(AVAILABLE_MODELS.MULTILINGUAL)
                              }
                              className={`block w-full text-left px-4 py-2 text-sm ${
                                currentModel === AVAILABLE_MODELS.MULTILINGUAL
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                              disabled={isChangingModel}
                            >
                              {currentModel ===
                                AVAILABLE_MODELS.MULTILINGUAL && (
                                <svg
                                  className="inline-block w-4 h-4 mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              Multilingual (MiniLM-L12-v2)
                            </button>
                          </div>
                          {isChangingModel && (
                            <div className="mt-4 flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Loading model...
                              </span>
                            </div>
                          )}
                          <div className="mt-6 flex justify-end">
                            <button
                              onClick={() => handleModelChange(currentModel)}
                              className="px-4 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                              disabled={isChangingModel}
                            >
                              Save Model
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 向量存储类型选项卡内容 */}
                      {activeTab === "vectorStore" && (
                        <div>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                            Vector Store Type
                          </h3>
                          <div className="space-y-3">
                            <button
                              onClick={() => setCurrentVectorStoreType("indexed-db")}
                              className={`block w-full text-left px-4 py-3 text-sm ${
                                currentVectorStoreType === "indexed-db"
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              {currentVectorStoreType === "indexed-db" && (
                                <svg
                                  className="inline-block w-4 h-4 mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              Indexed DB (Browser Local Storage)
                              <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                Fast, local, limited by browser storage
                              </div>
                            </button>
                            <button
                              onClick={() => setCurrentVectorStoreType("local-chroma")}
                              className={`block w-full text-left px-4 py-3 text-sm ${
                                currentVectorStoreType === "local-chroma"
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              {currentVectorStoreType === "local-chroma" && (
                                <svg
                                  className="inline-block w-4 h-4 mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              Local ChromaDB
                              <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                Local vector database, requires Node.js environment
                              </div>
                            </button>
                            <button
                              onClick={() => setCurrentVectorStoreType("cloud-chroma")}
                              className={`block w-full text-left px-4 py-3 text-sm ${
                                currentVectorStoreType === "cloud-chroma"
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              {currentVectorStoreType === "cloud-chroma" && (
                                <svg
                                  className="inline-block w-4 h-4 mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              Cloud ChromaDB
                              <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                Cloud-based vector database, scalable
                              </div>
                            </button>
                          </div>
                          <div className="mt-6 flex justify-end">
                            <button
                              onClick={() => handleVectorStoreChange(currentVectorStoreType)}
                              className="px-4 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                            >
                              Save Vector Store Type
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 图标库选项卡内容 */}
                      {activeTab === "iconLibraries" && (
                        <div className="h-full overflow-hidden flex flex-col">
                          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                            Icon Libraries
                          </h3>
                          <div className="text-sm mb-4">
                            已选：
                            <div className="inline-flex flex-wrap gap-2 mt-2">
                              {selectedLibraries.map((prefix) => {
                                const library = iconLibraries.find(
                                  (lib) => lib.prefix === prefix
                                );
                                if (!library) return null;
                                return (
                                  <span
                                    key={prefix}
                                    className="inline-flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs relative group"
                                  >
                                    {library.name}
                                    <button
                                      onClick={() => {
                                        setSelectedLibraries(
                                          selectedLibraries.filter(
                                            (libPrefix) => libPrefix !== prefix
                                          )
                                        );
                                      }}
                                      className="ml-1 p-0.5 text-blue-600 dark:text-blue-400 hover:text-red-500 dark:hover:text-red-400 hidden group-hover:block cursor-pointer"
                                      disabled={isUpdatingLibraries}
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </button>
                                  </span>
                                );
                              })}
                              {selectedLibraries.length === 0 && (
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  暂无选择
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-4 flex-1 overflow-auto">
                            {isLoadingLibraries ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Loading libraries...
                                </span>
                              </div>
                            ) : (
                              <div className="max-h-[400px] overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 gap-3">
                                  {iconLibraries.map((lib) => (
                                    <div
                                      key={lib.prefix}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`lib-${lib.prefix}`}
                                        checked={selectedLibraries.includes(
                                          lib.prefix
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedLibraries([
                                              ...selectedLibraries,
                                              lib.prefix,
                                            ]);
                                          } else {
                                            setSelectedLibraries(
                                              selectedLibraries.filter(
                                                (prefix) =>
                                                  prefix !== lib.prefix
                                              )
                                            );
                                          }
                                        }}
                                        disabled={isUpdatingLibraries}
                                        className="rounded text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                                      />
                                      <label
                                        htmlFor={`lib-${lib.prefix}`}
                                        className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer flex-1 truncate"
                                      >
                                        <span className="font-medium">
                                          {lib.name}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-500 ml-1">
                                          ({lib.total} icons)
                                        </span>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="pt-4 flex justify-end">
                            <button
                              onClick={handleUpdateLibraries}
                              className={`px-4 py-2 text-sm font-medium ${
                                selectedLibraries.length === 0
                                  ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                  : "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                              }`}
                              disabled={
                                isUpdatingLibraries ||
                                selectedLibraries.length === 0
                              }
                            >
                              {isUpdatingLibraries ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Updating...</span>
                                </div>
                              ) : (
                                "Save Libraries"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GitHub链接 */}
          <a
            href="https://github.com/lexmin0412/gimme-icon-next"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="GitHub Repository"
          >
            <svg
              className="w-8 h-8"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
            <img src="/icon.svg" alt="App Icon" width="36" height="36" />
            {APP_NAME}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{APP_DESCRIPTION}</p>
        </div>

        <SearchBar onSearch={handleSearch} />

        {/* <FilterPanel
          filters={context.filters}
          availableFilters={availableFilters}
          onFilterChange={handleFilterChange}
        /> */}

        <IconGrid results={context.results} onIconClick={handleIconClick} />

        <IconPreview
          icon={context.selectedIcon || null}
          onClose={handleClosePreview}
        />
      </div>
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

        // 读取保存的图标库配置
        let selectedLibraries = [];
        const savedLibraries = localStorage.getItem("selectedIconLibraries");
        if (savedLibraries) {
          try {
            selectedLibraries = JSON.parse(savedLibraries);
          } catch (error) {
            console.error("Error parsing saved libraries:", error);
          }
        }

        // 获取保存的向量存储类型并应用
        const savedVectorStoreType = localStorage.getItem("vectorStoreType") as VectorStoreType;
        if (savedVectorStoreType) {
          let config: VectorStoreConfig;
          
          switch (savedVectorStoreType) {
            case "indexed-db":
              config = { type: "indexed-db" };
              break;
            case "local-chroma":
              config = { 
                type: "local-chroma",
                collectionName: "Gimme-icons",
                persistDirectory: "./chromadb_data"
              };
              break;
            case "cloud-chroma":
              config = { 
                type: "cloud-chroma",
                collectionName: "Gimme-icons"
              };
              break;
            default:
              config = { type: "indexed-db" };
          }
          
          // 切换到保存的向量存储类型
          await iconSearchService.switchVectorStore(config);
        }
        
        // 初始化向量存储，传入用户保存的图标库配置
        await iconSearchService.initialize(false, selectedLibraries);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsAppLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isAppLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Initializing icon search...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SearchProvider>
      <HomeContent />
    </SearchProvider>
  );
};

export default Home;
