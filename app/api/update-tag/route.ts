import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { vectorStoreService } from '../../../services/vector-store-service';
import { embeddingService } from '../../../services/embedding';
import type { Icon } from '../../../types/icon';

type UpdateTagRequest = {
  id: string;
  newTag: string;
};

export async function POST(request: Request) {
  try {
    const body: UpdateTagRequest = await request.json();
    const { id, newTag } = body;

    if (!id || !newTag) {
      return NextResponse.json(
        { error: 'Missing required fields: id and newTag' },
        { status: 400 }
      );
    }

    // 读取icons.json文件
    const iconsPath = path.join(process.cwd(), 'data', 'icons.json');
    const iconsData = await fs.readFile(iconsPath, 'utf8');
    const icons = JSON.parse(iconsData);

    // 找到对应的图标
    const iconIndex = icons.findIndex((icon: Icon) => icon.id === id);
    if (iconIndex === -1) {
      return NextResponse.json({ error: 'Icon not found' }, { status: 404 });
    }

    const icon = icons[iconIndex];
    const tagToAdd = newTag.trim().toLowerCase();

    // 检查标签是否已存在
    if (icon.tags.includes(tagToAdd)) {
      return NextResponse.json(
        { error: 'Tag already exists' },
        { status: 400 }
      );
    }

    // 添加新标签
    icon.tags.push(tagToAdd);
    icons[iconIndex] = icon;

    // 写回文件
    await fs.writeFile(iconsPath, JSON.stringify(icons, null, 2), 'utf8');

    // 初始化服务
    await vectorStoreService.initialize();
    await embeddingService.initialize();

    // 如果不是降级模式，重新生成向量并更新向量存储
    if (!embeddingService.isUsingFallback()) {
      try {
        // 生成新的文档内容
        const document = `${icon.name} ${icon.tags.join(' ')} ${icon.synonyms.join(' ')}`;
        
        // 重新生成向量
        const newEmbedding = await embeddingService.generateEmbedding(document);
        
        // 获取向量存储
        const vectorStore = vectorStoreService.getVectorStore();
        
        // 更新向量存储中的向量
        await vectorStore.updateVector(id, newEmbedding, {
          name: icon.name,
          library: icon.library,
          category: icon.category,
          tags: icon.tags,
          synonyms: icon.synonyms,
        });
        
        console.log(`Updated vector for icon ${icon.id} after adding tag "${tagToAdd}"`);
      } catch (vectorError) {
        console.error('Error updating vector:', vectorError);
        // 向量更新失败不影响标签更新的返回结果
      }
    }

    return NextResponse.json({ success: true, icon });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}