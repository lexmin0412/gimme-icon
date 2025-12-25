import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';

// 处理获取向量数量的 API 路由
export async function GET(request: Request) {
  try {
    // 使用全局集合实例
    const collection = new ChromaCollection();
    
    // 获取向量数量
    const count = await collection.count();
    
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Get vector count failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get vector count' },
      { status: 500 }
    );
  }
}
