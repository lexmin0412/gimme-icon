import { NextResponse } from 'next/server';
import { chromaService } from '../../../services/chroma';
import type { VectorStoreConfig } from '../../../services/vector-stores/VectorStoreFactory';

// 处理向量存储配置的 API 路由
export async function POST(request: Request) {
  try {
    const config: VectorStoreConfig = await request.json();
    
    // 如果是云向量存储，在服务端处理
    if (config.type === 'cloud-chroma') {
      await chromaService.switchVectorStore(config);
      return NextResponse.json({ success: true, message: 'Vector store configuration applied successfully' });
    }
    
    // 其他类型的向量存储可以在客户端处理，直接返回成功
    return NextResponse.json({ success: true, message: 'Client-side vector store configuration' });
  } catch (error) {
    console.error('Failed to apply vector store configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply vector store configuration' },
      { status: 500 }
    );
  }
}

// 获取当前向量存储配置
export async function GET() {
  try {
    const config = chromaService.getVectorStoreConfig();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Failed to get vector store configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get vector store configuration' },
      { status: 500 }
    );
  }
}
