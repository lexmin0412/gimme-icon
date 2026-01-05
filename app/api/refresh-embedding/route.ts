import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';
import type { Icon } from '@/types/icon';

type EmbeddingItem = {
  icon: Icon;
  embedding: number[];
};

type RefreshEmbeddingRequest = {
  items: EmbeddingItem[];
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Support both single item (legacy) and batch (new) formats for backward compatibility
    let items: EmbeddingItem[] = [];
    
    if (body.items && Array.isArray(body.items)) {
      items = body.items;
    } else if (body.icon && body.embedding) {
      items = [{ icon: body.icon, embedding: body.embedding }];
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Validate all items
    for (const item of items) {
      if (!item.icon || !item.icon.id || !item.embedding || !Array.isArray(item.embedding)) {
        return NextResponse.json(
          { error: 'Missing required field in one or more items: icon, icon.id or embedding' },
          { status: 400 }
        );
      }
    }

    try {
      // Use ChromaCollection directly
      const collection = new ChromaCollection();
      
      // Batch update vector in Chroma
      // Handle batch limit (e.g., 300 items per request)
      const BATCH_SIZE = 300;
      const totalItems = items.length;
      let processedCount = 0;

      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batchItems = items.slice(i, i + BATCH_SIZE);
        
        // Prepare batch data
        const ids = batchItems.map(item => item.icon.id);
        const embeddings = batchItems.map(item => item.embedding);
        const metadatas = batchItems.map(item => ({
          name: item.icon.name,
          library: item.icon.library,
          category: item.icon.category,
          tags: Array.isArray(item.icon.tags) ? item.icon.tags.join(',') : '',
          synonyms: Array.isArray(item.icon.synonyms) ? item.icon.synonyms.join(',') : '',
        }));

        await collection.upsert({
          ids,
          embeddings,
          metadatas
        });
        
        processedCount += batchItems.length;
        console.log(`Processed batch ${i / BATCH_SIZE + 1}: ${batchItems.length} items`);
      }
      
      console.log(`Refreshed vectors for ${processedCount} icons`);
      return NextResponse.json({ 
        success: true, 
        message: `Successfully refreshed ${processedCount} embeddings`,
        count: processedCount
      });

    } catch (vectorError) {
      console.error('Error updating vector:', vectorError);
      return NextResponse.json(
        { error: 'Failed to update vector' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error refreshing embedding:', error);
    return NextResponse.json(
      { error: 'Failed to refresh embedding' },
      { status: 500 }
    );
  }
}
