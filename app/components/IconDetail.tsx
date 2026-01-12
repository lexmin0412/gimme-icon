"use client";
import React, { useState } from "react";
import type { Icon } from "@/types/icon";
import { useToast } from "./ToastProvider";
import { Icon as IconifyIcon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { embeddingService } from "@/services/embedding";
import { Copy, Plus, RefreshCw, X } from "lucide-react";

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

  const handleCopySvg = async () => {
    const svgContent = await fetch(`https://api.iconify.design/${icon.library}/${icon.name}.svg`).then((res)=>res.text())
    try {
      await navigator.clipboard.writeText(svgContent);
      showToast("SVG copied to clipboard!", "success");
    } catch (err) {
      console.error("Failed to copy SVG:", err);
      showToast("Failed to copy SVG", "error");
    }
  };

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(icon.name);
      showToast("Icon name copied to clipboard!", "success");
    } catch (err) {
      console.error("Failed to copy icon name:", err);
      showToast("Failed to copy icon name", "error");
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      setTagError("Please enter a tag");
      return;
    }

    setIsAddingTag(true);
    setTagError("");

    try {
      const response = await fetch("/api/update-tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: icon.id,
          newTag: newTag.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add tag");
      }

      // 更新本地图标数据
      if (onTagAdded) {
        onTagAdded(data.icon);
      }

      // 重置输入
      setNewTag("");
      showToast("Tag added successfully!", "success");
    } catch (error) {
      setTagError(error instanceof Error ? error.message : "Failed to add tag");
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRefreshEmbedding = async () => {
    setIsRefreshing(true);
    try {
      // 1. 初始化 embedding 服务
      await embeddingService.initialize();

      // 2. 生成 embedding
      const document = `${icon.name} ${icon.tags.join(
        " "
      )} ${icon.synonyms.join(" ")}`;
      const embedding = await embeddingService.generateEmbedding(document);

      // 3. 调用 API 更新向量
      const response = await fetch("/api/refresh-embedding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ icon: icon, embedding: embedding }],
        }),
      });

      const data = await response.json();

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
      <div className="flex items-start gap-4 px-5 pt-4 pb-2">
        {/* 左侧图标 */}
        <div className="p-3 bg-muted/50 rounded-xl shrink-0 flex items-center justify-center border border-border/50">
          <IconifyIcon
            icon={`${icon.library}:${icon.name}`}
            width={40}
            height={40}
            className="text-foreground"
          />
        </div>
        
        {/* 右侧信息 */}
        <div className="flex flex-col min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
               <h3 className="text-lg font-bold truncate leading-tight" title={icon.name}>{icon.name}</h3>
               <p className="text-xs text-muted-foreground mt-1 font-medium">{icon.library}</p>
            </div>
            
            <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-2">
               {/* 刷新按钮 */}
               <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleRefreshEmbedding}
                disabled={isRefreshing}
                title="Refresh Embedding Data"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
              
              {/* 关闭按钮 */}
              {showCloseButton && onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 pt-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {icon.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="px-1.5 py-0 text-[10px]">
                {tag}
              </Badge>
            ))}
            {icon.tags.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No tags</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add New Tag</h4>
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
          {tagError && <p className="text-[10px] text-destructive">{tagError}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="default" className="w-full h-9 text-sm" onClick={handleCopySvg}>
            <Copy className="mr-2 h-4 w-4" /> Copy SVG
          </Button>
          <Button
            variant="outline"
            className="w-full h-9 text-sm"
            onClick={handleCopyName}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy Name
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IconDetail;
