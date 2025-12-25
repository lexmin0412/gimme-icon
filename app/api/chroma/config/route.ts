import { NextResponse } from 'next/server';
import { getGlobalChromaClient } from '@/libs/chroma';

// 测试 Chroma 连接的 API 路由
export async function POST() {
  try {
    // 测试连接
    const client = await getGlobalChromaClient();
    
    // 尝试获取一个测试集合来验证连接
    await client.getOrCreateCollection({
      name: 'test_connection',
      metadata: {
        description: "Test connection collection",
        createdAt: new Date().toISOString(),
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Chroma connection test successful' 
    });
  } catch (error) {
    console.error('Chroma connection test failed:', error);
    return NextResponse.json(
      { success: false, error: 'Chroma connection test failed' },
      { status: 500 }
    );
  }
}

// 获取当前 Chroma 配置状态
export async function GET() {
  try {
    // 检查环境变量是否配置
    const hasEnvVars = !!(process.env.CHROMA_API_KEY && 
                         process.env.CHROMA_TENANT && 
                         process.env.CHROMA_DATABASE);
    
    return NextResponse.json({ 
      success: true, 
      configured: hasEnvVars,
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE,
    });
  } catch (error) {
    console.error('Failed to get Chroma configuration status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get Chroma configuration status' },
      { status: 500 }
    );
  }
}
