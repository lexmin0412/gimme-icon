import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';

// 处理删除向量的 API 路由
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
    
    // 删除向量
    await collection.delete({ ids: [id] });
    
    return NextResponse.json({ success: true, message: 'Vector deleted successfully' });
  } catch (error) {
    console.error('Delete vector failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete vector' },
      { status: 500 }
    );
  }
}