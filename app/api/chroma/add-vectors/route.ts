import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';

// 处理添加向量的 API 路由
export async function POST(request: Request) {
  try {
    const { items } = await request.json();
    
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing items parameter' },
        { status: 400 }
      );
    }
    
    // 使用全局集合实例
    const collection = new ChromaCollection();
    
    // 准备数据
    const ids = items.map((item) => item.id);
    const embeddings = items.map((item) => item.embedding);
    const metadatas = items.map((item) => {
      if (!item.metadata) return undefined;
      const metadata = item.metadata as Record<string, unknown>;
      const sanitized: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (Array.isArray(value)) {
          sanitized[key] = (value as unknown[]).join(',');
        } else {
          sanitized[key] = value as string | number | boolean;
        }
      }
      return sanitized;
    });
    
    // 添加向量
    await collection.upsert({
      ids,
      embeddings,
      metadatas: (() => {
        const valid = metadatas.filter(
          (m): m is { [key: string]: string | number | boolean } => !!m
        );
        return valid.length ? valid : undefined;
      })(),
    });
    
    return NextResponse.json({ success: true, message: 'Vectors added successfully' });
  } catch (error) {
    console.error('Add vectors failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add vectors' },
      { status: 500 }
    );
  }
}
