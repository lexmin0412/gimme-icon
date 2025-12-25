import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';

// 处理向量搜索的 API 路由
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { queryEmbedding, filters, limit, collectionName } = body;
    
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid queryEmbedding parameter' },
        { status: 400 }
      );
    }
    
    // 使用全局集合实例
    const collection = new ChromaCollection(
      collectionName || 'gimme_icon_collection'
    );
    
    // 执行向量搜索
    const searchResults = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit || 20,
      where: filters,
    });
    
    // 转换结果格式
    let results: Array<{
      id: string;
      score: number;
      metadata?: Record<string, string[] | string | number>;
    }> = [];
    
    if (searchResults.ids && searchResults.ids.length > 0 && searchResults.ids[0]) {
      results = searchResults.ids[0].map((id: string, index: number) => ({
        id,
        score: searchResults.distances?.[0]?.[index] || 0,
        metadata: searchResults.metadatas?.[0]?.[index] || undefined,
      }));
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
