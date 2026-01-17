"use client";
import React, { useState } from "react";
import type { Icon } from "@/types/icon";
import { useToast } from "./ToastProvider";
import { Icon as IconifyIcon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CopyButtonWithPreview } from "./CopyButtonWithPreview";
import { embeddingService } from "@/services/embedding";
import { Copy, Plus, X, Download } from "lucide-react";
import { iconSearchService } from "@/services/IconSearchService";

import { useLocalProjectPath } from "./ProjectSettings";
import { copy2Clipboard } from "@/libs/utils";

interface IconDetailProps {
  icon: Icon;
  onTagAdded?: (icon: Icon) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const IconDetail: React.FC<IconDetailProps> = ({
  icon,
  onTagAdded,
  onClose,
  showCloseButton = false,
}) => {
  const { showToast } = useToast();
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagError, setTagError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { path: projectPath } = useLocalProjectPath();
  const [loading, setLoading] = useState(false);

  // 核心方法：点击按钮执行 - 创建文件+写入内容+唤起VSCode
  const saveFileAndOpenVSCode = async (
    content: string,
    suggestedName: string,
    extensions: string[] = [".svg"]
  ) => {
    if (loading) return;
    setLoading(true);
    try {
      console.log("projectPath", projectPath);
      // 1. 浏览器原生API：唤起文件保存窗口，用户选择保存路径，完成授权（核心步骤）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName, // 推荐文件名，用户可修改
        types: [{ description: "Files", accept: { "*/*": extensions } }],
        excludeAcceptAllOption: false,
      });

      // 2. 写入你预设的【指定内容】到用户选择的本地文件中
      const writable = await fileHandle.createWritable();
      await writable.write(content); // 写入核心内容
      await writable.close(); // 完成写入，文件已在用户本地创建成功

      console.log("fileHandle.fullPath", fileHandle.fullPath);

      // 3. 提示用户文件已保存，并尝试用 VS Code 打开
      // 如果配置了本地项目路径，我们可以猜测完整路径
      if (projectPath) {
        // 注意：这里我们只能"猜测"用户确实保存在了这个目录下，并且文件名就是 suggestedName 或者 fileHandle.name
        const fileName = fileHandle.name;
        const fullPath = `${projectPath}/${fileName}`.replace(/\/+/g, "/");

        showToast(`✅ 文件已保存`, "success");

        // 尝试打开 VS Code
        const vscodeUrl = `vscode://file/${fullPath}`;
        window.open(vscodeUrl);
      } else {
        showToast(`✅ 文件已保存到本地`, "success");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        showToast("ℹ️ 你取消了文件保存操作", "info");
      } else if (!("showSaveFilePicker" in window)) {
        // Fallback: 如果不支持 showSaveFilePicker，使用传统下载方式
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("✅ 文件下载成功", "success");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        showToast(`❌ 保存失败：${errorMessage}`, "error");
        console.error("保存文件失败：", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const toPascalCase = (str: string) => {
    return str
      .split(/[-_:]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  };

  const generateReactComponent = (svgContent: string, name: string) => {
    const componentName = toPascalCase(name);
    const jsxContent = svgContent
      .replace(/class=/g, "className=")
      .replace(/fill-rule=/g, "fillRule=")
      .replace(/clip-rule=/g, "clipRule=")
      .replace(/stroke-width=/g, "strokeWidth=")
      .replace(/stroke-linecap=/g, "strokeLinecap=")
      .replace(/stroke-linejoin=/g, "strokeLinejoin=");

    return `import React from 'react';
import type { SVGProps } from 'react';

export const ${componentName} = (props: SVGProps<SVGSVGElement>) => (
${jsxContent.replace(/^/gm, "  ").replace(/<svg/, "<svg {...props}")}
);
`;
  };

  const generateVueComponent = (svgContent: string, name: string) => {
    const componentName = toPascalCase(name);
    // Vue templates usually keep kebab-case attributes, but we can bind listeners.
    // For simplicity, we just wrap the SVG in a template.
    // We can add v-bind="$attrs" to the svg tag to pass attributes.
    const vueContent = svgContent.replace(/<svg/, '<svg v-bind="$attrs"');

    return `<template>
${vueContent}
</template>

<script>
export default {
  name: '${componentName}'
}
</script>
`;
  };

  const generateSvelteComponent = (svgContent: string, name: string) => {
    // Svelte passes props via export let ... or just spreads attributes.
    // We can use $$props spread on the svg element.
    const svelteContent = svgContent.replace(/<svg/, '<svg {...$$props}');

    return `${svelteContent}`;
  };


  const fetchSvgContent = async () => {
    return await fetch(
      `https://api.iconify.design/${icon.library}/${icon.name}.svg`
    ).then((res) => res.text());
  };

  const fetchCssContent = async () => {
    return await fetch(
      `https://api.iconify.design/${icon.library}.css?icons=${icon.name}`
    ).then((res) => res.text());
  };

  const fetchReactComponentCode = async () => {
    const svgContent = await fetchSvgContent();
    return generateReactComponent(svgContent, icon.name);
  };

  const fetchVueComponentCode = async () => {
    const svgContent = await fetchSvgContent();
    return generateVueComponent(svgContent, icon.name);
  };

  const fetchSvelteComponentCode = async () => {
    const svgContent = await fetchSvgContent();
    return generateSvelteComponent(svgContent, icon.name);
  };

  const handleDownloadReactFile = async () => {
    try {
      const code = await fetchReactComponentCode();
      const fileName = `${toPascalCase(icon.name)}.tsx`;
      await saveFileAndOpenVSCode(code, fileName, [".tsx", ".ts"]);
    } catch (err) {
      console.error("Failed to download React component:", err);
      showToast("Failed to download React component", "error");
    }
  };

  const handleDownloadVueFile = async () => {
    try {
      const code = await fetchVueComponentCode();
      const fileName = `${toPascalCase(icon.name)}.vue`;
      await saveFileAndOpenVSCode(code, fileName, [".vue"]);
    } catch (err) {
      console.error("Failed to download Vue component:", err);
      showToast("Failed to download Vue component", "error");
    }
  };

  const handleDownloadSvelteFile = async () => {
    try {
      const code = await fetchSvelteComponentCode();
      const fileName = `${toPascalCase(icon.name)}.svelte`;
      await saveFileAndOpenVSCode(code, fileName, [".svelte"]);
    } catch (err) {
      console.error("Failed to download Svelte component:", err);
      showToast("Failed to download Svelte component", "error");
    }
  };


  const handleAddTag = async () => {
    if (!newTag.trim()) {
      setTagError("Please enter a tag");
      return;
    }

    setIsAddingTag(true);
    setTagError("");

    // 刷新向量
    try {
      await handleRefreshEmbedding([...icon.tags, newTag.trim()]);
      setTagError("");
    } catch (error) {
      setTagError(error instanceof Error ? error.message : "Failed to add tag");
    } finally {
      setIsAddingTag(false);
    }

    // 更新本地图标数据
    if (onTagAdded) {
      onTagAdded({ ...icon, tags: [...icon.tags, newTag.trim()] });
    }
    // 重置输入
    setNewTag("");
    showToast("Tag added successfully!", "success");
  };

  const handleRefreshEmbedding = async (customTags?: string[]) => {
    setIsRefreshing(true);
    try {
      // 1. 初始化 embedding 服务
      await embeddingService.initialize();

      // 2. 生成 embedding
      const tags = Array.isArray(customTags) ? customTags : icon.tags;
      const document = `${icon.name} ${tags.join(" ")} ${icon.synonyms.join(
        " "
      )}`;
      const embedding = await embeddingService.generateEmbedding(document);

      // 3. 调用 API 更新向量
      const response = await fetch("/api/refresh-embedding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              icon: {
                ...icon,
                tags,
              },
              embedding: embedding,
            },
          ],
        }),
      });

      const data = await response.json();

      // 更新成功后，应该使用当前 id 调用 search 接口刷新当前详情
      const result = await iconSearchService.getIcon(icon.id);

      if (result?.icon) {
        console.log("新的图标");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to refresh embedding");
      }

      showToast("Embedding refreshed successfully!", "success");
    } catch (error) {
      console.error("Failed to refresh embedding:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to refresh embedding",
        "error"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto max-h-[calc(100vh-2rem)]">
      {/* 紧凑头部区域 */}
      <div className="flex items-stretch gap-4 px-5 pt-4 pb-2">
        {/* 左侧图标 */}
        <div className="h-20 w-20 bg-muted/50 rounded-xl shrink-0 flex items-center justify-center border border-border/50">
          <IconifyIcon
            icon={`${icon.library}:${icon.name}`}
            width={48}
            height={48}
            className="text-foreground"
          />
        </div>

        {/* 右侧信息 */}
        <div className="min-w-0 flex-1 pt-0.5 relative h-20">
          <h3
            className="text-lg h-7 leading-7 font-bold truncate"
            title={icon.name}
          >
            {icon.library}:{icon.name}
          </h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {icon.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-1.5 py-0 text-[10px]"
              >
                {tag}
              </Badge>
            ))}
            {icon.tags.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No tags
              </span>
            )}
          </div>
        </div>

        {/* 关闭按钮 */}
        {showCloseButton && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4 p-6 pt-2">
        <div className="space-y-2 hidden">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add New Tag
          </h4>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Enter tag..."
              disabled={isAddingTag}
              className="h-8 text-sm"
            />
            <Button
              onClick={handleAddTag}
              disabled={isAddingTag || !newTag.trim()}
              size="icon"
              className="shrink-0 h-8 w-8"
            >
              {isAddingTag ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          {tagError && (
            <p className="text-[10px] text-destructive">{tagError}</p>
          )}
        </div>

        {/* Snippets Group */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Snippets
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <CopyButtonWithPreview
              key={`${icon.library}:${icon.name}-svg`}
              variant="outline"
              className="w-full h-9 text-sm"
              contentOrFetcher={fetchSvgContent}
              copyMessage="SVG copied to clipboard!"
            >
              <Copy className="mr-2 h-4 w-4" /> Copy SVG
            </CopyButtonWithPreview>
            <CopyButtonWithPreview
              key={`${icon.library}:${icon.name}-css`}
              variant="outline"
              className="w-full h-9 text-sm"
              contentOrFetcher={fetchCssContent}
              copyMessage="CSS copied to clipboard!"
            >
              <Copy className="mr-2 h-4 w-4" /> Copy CSS
            </CopyButtonWithPreview>
            <CopyButtonWithPreview
              key={`${icon.library}:${icon.name}-name`}
              variant="outline"
              className="w-full h-9 text-sm"
              contentOrFetcher={`${icon.library}:${icon.name}`}
              copyMessage="Name copied!"
            >
              <Copy className="mr-2 h-4 w-4" /> Copy Name
            </CopyButtonWithPreview>
          </div>
        </div>

        {/* Components Group */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Components
          </h4>
          <div className="space-y-2">
            {/* React Component */}
            <div className="flex items-center justify-between border rounded-md p-2 pl-3">
              <span className="text-sm font-medium">React Component</span>
              <div className="flex gap-2">
                <CopyButtonWithPreview
                  key={`${icon.library}:${icon.name}-react`}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  contentOrFetcher={fetchReactComponentCode}
                  copyMessage="React component copied!"
                  title="Copy Code"
                >
                  <Copy className="h-4 w-4" />
                </CopyButtonWithPreview>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={handleDownloadReactFile}
                  title="Download File"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Vue Component */}
            <div className="flex items-center justify-between border rounded-md p-2 pl-3">
              <span className="text-sm font-medium">Vue Component</span>
              <div className="flex gap-2">
                <CopyButtonWithPreview
                  key={`${icon.library}:${icon.name}-vue`}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  contentOrFetcher={fetchVueComponentCode}
                  copyMessage="Vue component copied!"
                  title="Copy Code"
                >
                  <Copy className="h-4 w-4" />
                </CopyButtonWithPreview>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={handleDownloadVueFile}
                  title="Download File"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Svelte Component */}
            <div className="flex items-center justify-between border rounded-md p-2 pl-3">
              <span className="text-sm font-medium">Svelte Component</span>
              <div className="flex gap-2">
                <CopyButtonWithPreview
                  key={`${icon.library}:${icon.name}-svelte`}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  contentOrFetcher={fetchSvelteComponentCode}
                  copyMessage="Svelte component copied!"
                  title="Copy Code"
                >
                  <Copy className="h-4 w-4" />
                </CopyButtonWithPreview>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={handleDownloadSvelteFile}
                  title="Download File"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconDetail;
