import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 复制到剪贴板
 */
export async function copy2Clipboard(text: string) {
  return await navigator.clipboard.writeText(text)
}