import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';
import type { VectorStoreItem } from '@/services/vector-stores/IVectorStore';

// 处理获取向量的 API 路由
export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing ids parameter' },
        { status: 400 }
      );
    }
    
    // 使用全局集合实例
    const collection = new ChromaCollection();
    
    // 获取向量
    const result = await collection.get({ ids });
    
    // 转换结果格式
    const vectors: VectorStoreItem[] = result.ids.map((id: string, index: number) => ({
      id,
      embedding: result.embeddings?.[index] || [],
      metadata: result.metadatas?.[index] || undefined,
    }));
    
    return NextResponse.json({ success: true, vectors });
  } catch (error) {
    console.error('Get vectors failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get vectors' },
      { status: 500 }
    );
  }
}
