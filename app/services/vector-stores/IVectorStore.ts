export interface VectorStoreItem {
  id: string;
  embedding: number[];
  metadata?: Record<string, string[] | string | number>;
}

export interface IVectorStore {
  /**
   * 初始化向量存储
   */
  initialize(): Promise<void>;

  /**
   * 添加单个向量到存储中
   * @param item 向量存储项
   */
  addVector(item: VectorStoreItem): Promise<void>;

  /**
   * 批量添加向量到存储中
   * @param items 向量存储项数组
   */
  addVectors(items: VectorStoreItem[]): Promise<void>;

  /**
   * 根据ID获取向量
   * @param id 向量ID
   * @returns 向量数据，如果不存在返回undefined
   */
  getVector(id: string): Promise<VectorStoreItem | undefined>;

  /**
   * 根据ID批量获取向量
   * @param ids 向量ID数组
   * @returns 向量数据数组
   */
  getVectors(ids: string[]): Promise<VectorStoreItem[]>;

  /**
   * 搜索与查询向量最相似的向量
   * @param queryVector 查询向量
   * @param limit 返回结果数量
   * @param filters 可选的过滤条件
   * @returns 搜索结果数组，包含ID、相似度分数和元数据
   */
  searchSimilarVectors(
    queryVector: number[],
    limit: number,
    filters?: Record<string, string[] | string>
  ): Promise<{ id: string; score: number; metadata?: Record<string, string[] | string | number> }[]>;

  /**
   * 删除指定ID的向量
   * @param id 向量ID
   */
  deleteVector(id: string): Promise<void>;

  /**
   * 清空向量存储
   */
  clear(): Promise<void>;

  /**
   * 检查存储中是否包含指定ID的向量
   * @param id 向量ID
   */
  hasVector(id: string): Promise<boolean>;

  /**
   * 获取存储中的向量数量
   */
  getVectorCount(): Promise<number>;
}
