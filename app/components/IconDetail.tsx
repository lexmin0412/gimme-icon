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
    try {
      await navigator.clipboard.writeText(icon.svg);
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
      {showCloseButton && onClose && (
        <div className="flex justify-end p-1">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex flex-col items-center gap-3 px-6 pb-4">
        <div className="p-6 bg-muted rounded-xl">
          <IconifyIcon
            icon={`${icon.library}:${icon.name}`}
            width={56}
            height={56}
          />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold truncate max-w-[250px]">{icon.name}</h3>
          <p className="text-sm text-muted-foreground">
            {icon.library} - {icon.category}
          </p>
        </div>
      </div>

      <div className="flex justify-center px-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground h-8 text-xs"
          onClick={handleRefreshEmbedding}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh Embedding Data"}
        </Button>
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
