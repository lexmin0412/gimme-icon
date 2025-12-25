import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { Icon } from '@/types/icon';

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

    // Return the updated icon
    // The client is responsible for regenerating the embedding and updating the vector store
    return NextResponse.json({ success: true, icon });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}