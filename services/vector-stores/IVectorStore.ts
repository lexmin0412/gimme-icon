export interface VectorStoreItem {
  id: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface IVectorStore {
  /**
   * Initialize the vector store
   */
  initialize(): Promise<void>;

  /**
   * Search for vectors similar to the query vector
   * @param queryVector Query vector
   * @param limit Maximum number of results
   * @param filters Optional filters
   */
  searchVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, unknown>
  ): Promise<SearchResult[]>;

  /**
   * Get a vector by ID
   * @param id Vector ID
   */
  getVector(id: string): Promise<VectorStoreItem | undefined>;

  /**
   * Get multiple vectors by IDs
   * @param ids Vector IDs
   */
  getVectors(ids: string[]): Promise<VectorStoreItem[]>;

  /**
   * Add a single vector
   * @param item Vector item
   */
  addVector(item: VectorStoreItem): Promise<void>;

  /**
   * Batch add vectors
   * @param items Vector items
   */
  batchAddVectors(items: VectorStoreItem[]): Promise<void>;

  /**
   * Update a vector
   * @param id Vector ID
   * @param vector New embedding vector
   * @param metadata New metadata
   */
  updateVector(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Batch update vectors
   * @param items Items to update
   */
  batchUpdateVectors(items: { id: string; vector: number[]; metadata?: Record<string, unknown> }[]): Promise<void>;

  /**
   * Delete a vector by ID
   * @param id Vector ID
   */
  deleteVector(id: string): Promise<void>;

  /**
   * Batch delete vectors by IDs
   * @param ids Vector IDs
   */
  batchDeleteVectors(ids: string[]): Promise<void>;

  /**
   * Check if a vector exists
   * @param id Vector ID
   */
  hasVector(id: string): Promise<boolean>;

  /**
   * Get the total count of vectors
   */
  getVectorCount(): Promise<number>;

  /**
   * Clear the vector store
   */
  clear(): Promise<void>;
}
