/**
 * 通用超时处理工具函数
 * @param operation 要执行的异步操作
 * @param timeoutMs 超时时间（毫秒）
 * @param errorMessage 超时错误信息
 * @returns 异步操作的结果
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    })
  ]);
}