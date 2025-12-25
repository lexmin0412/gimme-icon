import { NextResponse } from 'next/server';
import { ChromaCollection } from '@/libs/chroma';
import type { Icon } from '@/types/icon';

type RefreshEmbeddingRequest = {
  icon: Icon;
  embedding: number[];
  collectionName?: string;
};

export async function POST(request: Request) {
  try {
    const body: RefreshEmbeddingRequest = await request.json();
    const { icon, embedding, collectionName } = body;

    if (!icon || !icon.id || !embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: 'Missing required field: icon, icon.id or embedding' },
        { status: 400 }
      );
    }

    try {
      // Use ChromaCollection directly
      const collection = new ChromaCollection(
        collectionName || 'Gimme-icons'
      );
      
      // Update vector in Chroma
      await collection.upsert({
        ids: [icon.id],
        embeddings: [embedding],
        metadatas: [{
          name: icon.name,
          library: icon.library,
          category: icon.category,
          tags: Array.isArray(icon.tags) ? icon.tags.join(',') : '',
          synonyms: Array.isArray(icon.synonyms) ? icon.synonyms.join(',') : '',
        }]
      });
      
      console.log(`Refreshed vector for icon ${icon.id}`);
      return NextResponse.json({ success: true, message: 'Embedding refreshed successfully' });

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
