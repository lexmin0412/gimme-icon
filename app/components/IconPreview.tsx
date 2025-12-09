'use client';
import React from 'react';
import type { Icon } from '../types/icon';

interface IconPreviewProps {
  icon: Icon | null;
  onClose: () => void;
}

const IconPreview: React.FC<IconPreviewProps> = ({ icon, onClose }) => {
  if (!icon) return null;

  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(icon.svg);
      alert('SVG copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy SVG:', err);
    }
  };

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(icon.name);
      alert('Icon name copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy icon name:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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