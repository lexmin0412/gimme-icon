import { NextResponse } from 'next/server';
import { ChromaClient, getChromaCollectionName } from '@/libs/chroma';

// 处理清空向量存储的 API 路由
export async function POST(request: Request) {
  try {
    // 集合名称从环境变量读取
    const name = getChromaCollectionName();
    
    // 删除集合
    const clientWrapper = new ChromaClient();
    await clientWrapper.deleteCollection({ name });
    
    return NextResponse.json({ success: true, message: 'Vector store cleared successfully' });
  } catch (error) {
    console.error('Clear vector store failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear vector store' },
      { status: 500 }
    );
  }
}
