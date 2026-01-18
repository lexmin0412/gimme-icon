import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 复制到剪贴板 (文本)
 */
export async function copy2Clipboard(text: string) {
  return await navigator.clipboard.writeText(text)
}

/**
 * 复制图片到剪贴板
 */
export async function copyImage2Clipboard(blob: Blob) {
  try {
    const item = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([item]);
  } catch (err) {
    console.error("Failed to copy image to clipboard:", err);
    throw err;
  }
}