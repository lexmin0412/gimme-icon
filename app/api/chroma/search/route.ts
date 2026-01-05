import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';

// 处理向量搜索的 API 路由
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { queryEmbedding, limit } = body;
    
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid queryEmbedding parameter' },
        { status: 400 }
      );
    }
    
    // 使用全局集合实例
    const collection = new ChromaCollection();
    
    // 执行向量搜索
    const searchResults = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit || 20,
      // where: filters,
    });
    
    // 转换结果格式
    let results: Array<{
      id: string;
      score: number;
      metadata?: Record<string, string | number | boolean> | undefined;
    }> = [];
    
    if (searchResults.ids && searchResults.ids.length > 0 && searchResults.ids[0]) {
      results = searchResults.ids[0].map((id: string, index: number) => ({
        id,
        score: (() => {
          // 明确变量是余弦距离，增强可读性
          const cosineDistance = searchResults.distances?.[0]?.[index] ?? 2;
          // 钳位到余弦距离的合法区间
          const clampedDistance = Math.min(2, Math.max(0, cosineDistance));
          // 映射到0~1的相似度得分
          const similarityScore = 1 - (clampedDistance / 2);
          return similarityScore;
        })(),
        metadata: (searchResults.metadatas?.[0]?.[index] as Record<string, string | number | boolean> | undefined) ?? undefined,
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
