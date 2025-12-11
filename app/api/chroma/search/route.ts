import { NextResponse } from 'next/server';
import { vectorStoreService } from '../../../../services/vector-store-service';
import type { FilterOptions } from '../../../../types/icon';

// 处理向量搜索的 API 路由
export async function POST(request: Request) {
  try {
    const { query, filters, limit } = await request.json();
    
    // 在服务端执行搜索
    const results = await vectorStoreService.searchIcons(query, filters as FilterOptions, limit || 20);
    
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
