import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';

// 处理更新向量的 API 路由
export async function POST(request: Request) {
  try {
    const { id, embedding, metadata } = await request.json();
    
    if (!id || !embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing parameters' },
        { status: 400 }
      );
    }
    
    // 使用全局集合实例
    const collection = new ChromaCollection();
    
    // 处理元数据中的数组，将其转换为字符串
    const sanitizedMetadata = metadata ? (() => {
      const meta = metadata as Record<string, unknown>;
      const sanitized: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(meta)) {
        if (Array.isArray(value)) {
          sanitized[key] = (value as unknown[]).join(',');
        } else {
          sanitized[key] = value as string | number | boolean;
        }
      }
      return sanitized;
    })() : undefined;

    // 更新向量
    await collection.upsert({
      ids: [id],
      embeddings: [embedding],
      metadatas: sanitizedMetadata ? [sanitizedMetadata] : undefined,
    });
    
    return NextResponse.json({ success: true, message: 'Vector updated successfully' });
  } catch (error) {
    console.error('Update vector failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update vector' },
      { status: 500 }
    );
  }
}
