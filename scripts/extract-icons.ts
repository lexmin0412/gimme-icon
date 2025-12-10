#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Icon } from '../types/icon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从图标名称生成标签和同义词
function generateTagsAndSynonyms(name: string): { tags: string[]; synonyms: string[] } {
  // 将驼峰命名转换为空格分隔的单词
  const words = name.replace(/([A-Z])/g, ' $1').toLowerCase().trim().split(' ');
  
  // 生成标签：基本单词和组合单词
  const tags = [...new Set(words)];
  
  // 简单的同义词生成逻辑（可以根据需要扩展）
  const synonyms: string[] = [];
  
  // 根据常见图标类型添加同义词
  if (name.includes('Search')) {
    synonyms.push('magnify', 'find', 'look for', 'seek', 'explore');
  } else if (name.includes('Home')) {
    synonyms.push('house', 'residence', 'dwelling', 'abode', 'habitat');
  } else if (name.includes('User')) {
    synonyms.push('person', 'profile', 'individual', 'account', 'member');
  } else if (name.includes('Settings')) {
    synonyms.push('config', 'preferences', 'options', 'setup', 'configuration');
  } else if (name.includes('Mail')) {
    synonyms.push('email', 'message', 'send', 'receive', 'communication');
  } else if (name.includes('Phone')) {
    synonyms.push('call', 'telephone', 'contact', 'dial', 'mobile');
  } else if (name.includes('Bell')) {
    synonyms.push('notification', 'alert', 'reminder', 'warning', 'signal');
  } else if (name.includes('Calendar')) {
    synonyms.push('date', 'schedule', 'event', 'appointment', 'timeline');
  } else if (name.includes('Folder')) {
    synonyms.push('directory', 'storage', 'file', 'document', 'container');
  } else if (name.includes('Download')) {
    synonyms.push('save', 'get', 'fetch', 'retrieve', 'import');
  } else if (name.includes('Upload')) {
    synonyms.push('send', 'post', 'share', 'transfer', 'export');
  } else if (name.includes('Trash')) {
    synonyms.push('delete', 'remove', 'discard', 'bin', 'waste');
  } else if (name.includes('Edit')) {
    synonyms.push('modify', 'update', 'change', 'correct', 'revise');
  } else if (name.includes('Check')) {
    synonyms.push('approve', 'confirm', 'verify', 'validate', 'tick');
  } else if (name.includes('X') || name.includes('Close')) {
    synonyms.push('cancel', 'delete', 'remove', 'exit', 'dismiss');
  } else if (name.includes('Plus')) {
    synonyms.push('add', 'new', 'create', 'increase', 'append');
  } else if (name.includes('Minus')) {
    synonyms.push('remove', 'decrease', 'subtract', 'reduce', 'delete');
  } else if (name.includes('Arrow')) {
    const direction = words.find(word => ['left', 'right', 'up', 'down'].includes(word));
    if (direction) {
      if (direction === 'left') {
        synonyms.push('back', 'previous', 'return', 'go back');
      } else if (direction === 'right') {
        synonyms.push('forward', 'next', 'continue', 'proceed');
      } else if (direction === 'up') {
        synonyms.push('increase', 'rise', 'ascend', 'top');
      } else if (direction === 'down') {
        synonyms.push('decrease', 'fall', 'descend', 'bottom');
      }
    }
  }
  
  return { tags, synonyms };
}

// 从Heroicons的图标文件中提取SVG
function extractHeroiconSvg(jsContent: string): string {
  // 清理内容，移除 /*#__PURE__*/ 注释
  const cleanedContent = jsContent.replace(/\/\*#__PURE__\*\//g, '');
  
  // 提取路径数据
  const pathRegex = /d:\s*(["'])([\s\S]*?)\1/g;
  const paths: string[] = [];
  
  let pathMatch;
  while ((pathMatch = pathRegex.exec(cleanedContent)) !== null) {
    paths.push(pathMatch[2]);
  }
  
  // 如果没有找到路径，返回空的SVG
  if (paths.length === 0) return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"></svg>';
  
  // 提取strokeWidth
  const strokeWidthMatch = cleanedContent.match(/strokeWidth:\s*(\d+\.\d+|\d+)/);
  const strokeWidth = strokeWidthMatch ? strokeWidthMatch[1] : '1.5';
  
  // 构建SVG字符串
  let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="${strokeWidth}">`;
  
  // 添加所有路径
  for (const path of paths) {
    svgStr += `<path stroke-linecap="round" stroke-linejoin="round" d="${path}"/>`;
  }
  
  svgStr += '</svg>';
  
  return svgStr;
}

// 从Lucide的图标节点创建SVG
function createLucideSvg(iconNode: any[]): string {
  let svgStr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  
  // 处理每个节点
  for (const node of iconNode) {
    const [tagName, attrs] = node;
    
    svgStr += `<${tagName}`;
    
    // 添加属性
    for (const [key, value] of Object.entries(attrs)) {
      if (key !== 'key') { // 过滤掉React的key属性
        svgStr += ` ${key}="${value}"`;
      }
    }
    
    svgStr += '/>';
  }
  
  svgStr += '</svg>';
  
  return svgStr;
}

async function extractIcons() {
  const icons: Icon[] = [];
  
  // 1. 提取 Heroicons 图标
  const heroiconsDir = path.join(__dirname, '../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.1/node_modules/@heroicons/react/24');
  
  // 提取 Outline 图标
  const outlineDir = path.join(heroiconsDir, 'outline');
  const outlineFiles = await fs.readdir(outlineDir);
  
  for (const file of outlineFiles) {
    if (file.endsWith('.js')) {
      // 提取图标名称（去掉Icon.js后缀）
      const iconName = file.replace(/Icon\.js$/, '');
      // 将驼峰命名转换为小写字母+连字符格式
      const name = iconName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
      
      // 读取文件内容
      const filePath = path.join(outlineDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // 提取SVG
      const svg = extractHeroiconSvg(content);
      
      // 生成标签和同义词
      const { tags, synonyms } = generateTagsAndSynonyms(iconName);
      
      // 创建图标对象
      const icon: Icon = {
        id: `heroicons-${name}`,
        name,
        svg,
        library: 'heroicons',
        category: 'outline',
        tags,
        synonyms,
      };
      
      icons.push(icon);
    }
  }
  
  // 提取 Solid 图标
  const solidDir = path.join(heroiconsDir, 'solid');
  const solidFiles = await fs.readdir(solidDir);
  
  for (const file of solidFiles) {
    if (file.endsWith('.js')) {
      // 提取图标名称（去掉Icon.js后缀）
      const iconName = file.replace(/Icon\.js$/, '');
      // 将驼峰命名转换为小写字母+连字符格式
      const name = iconName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
      
      // 读取文件内容
      const filePath = path.join(solidDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // 提取SVG
      const svg = extractHeroiconSvg(content);
      
      // 生成标签和同义词
      const { tags, synonyms } = generateTagsAndSynonyms(iconName);
      
      // 创建图标对象
      const icon: Icon = {
        id: `heroicons-solid-${name}`,
        name,
        svg,
        library: 'heroicons',
        category: 'solid',
        tags,
        synonyms,
      };
      
      icons.push(icon);
    }
  }
  
  // 2. 提取 Lucide 图标
  const lucideDir = path.join(__dirname, '../node_modules/.pnpm/lucide-react@0.556.0_react@19.2.1/node_modules/lucide-react/dist/esm/icons');
  const lucideFiles = await fs.readdir(lucideDir);
  
  for (const file of lucideFiles) {
    if (file.endsWith('.js') && !file.includes('.map')) {
      // 提取图标名称（去掉.js后缀）
      const iconName = file.replace(/\.js$/, '');
      // 将连字符格式转换为驼峰命名
      const camelCaseName = iconName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      
      // 读取文件内容
      const filePath = path.join(lucideDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // 提取__iconNode
      const iconNodeMatch = content.match(/const __iconNode = ([\s\S]*?);/);
      if (iconNodeMatch) {
        try {
          // 使用更可靠的方法解析图标节点
          let iconNodeStr = iconNodeMatch[1];
          
          // 移除key属性
          iconNodeStr = iconNodeStr.replace(/key:\s*"[\w-]+"(,)?/g, (match, comma) => comma ? '' : '');
          
          // 将单引号转换为双引号
          iconNodeStr = iconNodeStr.replace(/'/g, '"');
          
          // 添加引号到属性名
          iconNodeStr = iconNodeStr.replace(/([a-z0-9_]+):/g, '"$1":');
          
          // 移除多余的逗号
          iconNodeStr = iconNodeStr.replace(/,\s*([}\]])/g, '$1');
          
          // 解析图标节点
          const iconNode = JSON.parse(iconNodeStr);
          
          // 创建SVG
          const svg = createLucideSvg(iconNode);
          
          // 生成标签和同义词
          const { tags, synonyms } = generateTagsAndSynonyms(camelCaseName);
          
          // 创建图标对象
          const icon: Icon = {
            id: `lucide-${iconName}`,
            name: iconName,
            svg,
            library: 'lucide',
            category: 'solid',
            tags,
            synonyms,
          };
          
          icons.push(icon);
        } catch (error) {
          console.error(`Error parsing icon node for ${iconName}:`, error);
        }
      }
    }
  }

  // 保存图标数据
  await fs.mkdir(path.join(__dirname, '../data'), { recursive: true });
  await fs.writeFile(
    path.join(__dirname, '../data/icons.json'),
    JSON.stringify(icons, null, 2)
  );

  console.log(`Extracted ${icons.length} icons`);
}

extractIcons().catch(console.error);