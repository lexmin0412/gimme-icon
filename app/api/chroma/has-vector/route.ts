import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';

// 处理检查向量是否存在的 API 路由
export async function POST(request: Request) {
  try {
    const { id, collectionName } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id parameter' },
        { status: 400 }
      );
    }
    
    // 使用全局集合实例
    const collection = new ChromaCollection(
      collectionName || 'gimme_icon_collection'
    );
    
    // 检查向量是否存在
    const result = await collection.get({ ids: [id] });
    const hasVector = result.ids && result.ids.length > 0;
    
    return NextResponse.json({ success: true, hasVector });
  } catch (error) {
    console.error('Check vector existence failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check vector existence' },
      { status: 500 }
    );
  }
}