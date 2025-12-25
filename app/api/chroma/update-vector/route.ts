import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';

// 处理更新向量的 API 路由
export async function POST(request: Request) {
  try {
    const { id, embedding, metadata, collectionName } = await request.json();
    
    if (!id || !embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing parameters' },
        { status: 400 }
      );
    }
    
    // 使用全局集合实例
    const collection = new ChromaCollection(
      collectionName || 'gimme_icon_collection'
    );
    
    // 更新向量
    await collection.upsert({
      ids: [id],
      embeddings: [embedding],
      metadatas: metadata ? [metadata] : undefined,
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