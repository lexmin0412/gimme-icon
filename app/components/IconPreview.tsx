'use client';
import React, { useState } from 'react';
import type { Icon } from '../../types/icon';
import { useToast } from './ToastProvider';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.7)]">
      <div className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="p-6 bg-gray-100 rounded-lg dark:bg-gray-700">
            <div dangerouslySetInnerHTML={{ __html: icon.svg }} className="w-24 h-24 flex items-center justify-center" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{icon.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{icon.library} - {icon.category}</p>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {icon.tags.map((tag, index) => (
              <span 
                key={index} 
                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Add New Tag</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Enter tag..."
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isAddingTag}
            />
            <button
              onClick={handleAddTag}
              disabled={isAddingTag || !newTag.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isAddingTag ? 'Adding...' : 'Add'}
            </button>
          </div>
          {tagError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{tagError}</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCopySvg}
            className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Copy SVG
          </button>
          <button
            onClick={handleCopyName}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200"
          >
            Copy Name
          </button>
        </div>
      </div>
    </div>
  );
};

export default IconPreview;