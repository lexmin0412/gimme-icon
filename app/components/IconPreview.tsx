'use client';
import React, { useState } from 'react';
import type { Icon } from '@/types/icon';
import { useToast } from './ToastProvider';
import { Icon as IconifyIcon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { embeddingService } from '@/services/embedding';
import { Copy, Plus, RefreshCw } from 'lucide-react';

interface IconPreviewProps {
  icon: Icon | null;
  onClose: () => void;
  onTagAdded?: (icon: Icon) => void;
}

const IconPreview: React.FC<IconPreviewProps> = ({ icon, onClose, onTagAdded }) => {
  const { showToast } = useToast();
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagError, setTagError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // If icon is null, the Dialog should not be open.
  // We can control open state based on icon existence.
  const isOpen = !!icon;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  if (!icon) return null;

  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(icon.svg);
      showToast('SVG copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy SVG:', err);
      showToast('Failed to copy SVG', 'error');
    }
  };

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(icon.name);
      showToast('Icon name copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy icon name:', err);
      showToast('Failed to copy icon name', 'error');
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      setTagError('Please enter a tag');
      return;
    }

    setIsAddingTag(true);
    setTagError('');

    try {
      const response = await fetch('/api/update-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: icon.id,
          newTag: newTag.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add tag');
      }

      // 更新本地图标数据
      if (onTagAdded) {
        onTagAdded(data.icon);
      }

      // 重置输入
      setNewTag('');
      showToast('Tag added successfully!', 'success');
    } catch (error) {
      setTagError(error instanceof Error ? error.message : 'Failed to add tag');
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
      const document = `${icon.name} ${icon.tags.join(' ')} ${icon.synonyms.join(' ')}`;
      const embedding = await embeddingService.generateEmbedding(document);

      // 3. 调用 API 更新向量
      const response = await fetch('/api/refresh-embedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{ icon: icon, embedding: embedding }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh embedding');
      }

      showToast('Embedding refreshed successfully!', 'success');
    } catch (error) {
      console.error('Failed to refresh embedding:', error);
      showToast(error instanceof Error ? error.message : 'Failed to refresh embedding', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4">
             <div className="p-4 bg-muted rounded-lg">
                <IconifyIcon icon={`${icon.library}:${icon.name}`} width={48} height={48} />
             </div>
             <div className="text-center">
                <DialogTitle className="text-xl">{icon.name}</DialogTitle>
                <DialogDescription>
                  {icon.library} - {icon.category}
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="flex justify-center">
            <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground"
                onClick={handleRefreshEmbedding}
                disabled={isRefreshing}
            >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Embedding Data'}
            </Button>
        </div>
        
        <div className="space-y-4 py-2">
            <div>
                <h4 className="mb-2 text-sm font-medium">Tags</h4>
                <div className="flex flex-wrap gap-2">
                    {icon.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                        {tag}
                    </Badge>
                    ))}
                    {icon.tags.length === 0 && <span className="text-xs text-muted-foreground">No tags</span>}
                </div>
            </div>
            
            <div className="space-y-2">
                 <h4 className="text-sm font-medium">Add New Tag</h4>
                 <div className="flex gap-2">
                    <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Enter tag..."
                        disabled={isAddingTag}
                        className="h-9"
                    />
                    <Button onClick={handleAddTag} disabled={isAddingTag || !newTag.trim()} size="sm">
                        {isAddingTag ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="h-4 w-4" />}
                        <span className="sr-only">Add</span>
                    </Button>
                 </div>
                 {tagError && (
                    <p className="text-xs text-destructive">{tagError}</p>
                 )}
            </div>
        </div>

        <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleCopySvg}>
                <Copy className="mr-2 h-4 w-4" /> Copy SVG
            </Button>
             <Button variant="secondary" className="flex-1" onClick={handleCopyName}>
                <Copy className="mr-2 h-4 w-4" /> Copy Name
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IconPreview;