// 从 @xenova/transformers 导入 pipeline
import { pipeline } from '@huggingface/transformers';

interface ProgressCallbackData {
  status?: string;
  file?: string;
  progress?: number;
  url?: string;
}

interface ExtendedNavigator extends Navigator {
  gpu?: any;
  deviceMemory?: number;
}

class EmbeddingService {
  private embedder: any; // 使用 any 类型绕过类型检查，因为 pipeline 返回的类型复杂且不透明
  private initialized: boolean = false;
  private useFallback: boolean = false; // 默认尝试使用真实模型

  async initialize() {
    if (this.initialized || this.useFallback) return;
    
    // 最大重试次数
    const maxRetries = 3;
    // 当前重试计数
    let retryCount = 0;
    // 每次尝试的超时时间（毫秒）
    const timeoutMs = 30000; // 30秒超时
    
    while (retryCount < maxRetries) {
      try {
        // 添加环境诊断信息
        console.log('=== Embedding Service Initialization Diagnostics ===');
        const extNavigator = navigator as ExtendedNavigator;
        console.log('Browser:', extNavigator.userAgent);
        console.log('@xenova/transformers version:', 'N/A (runtime check)');
        console.log('Support WebAssembly:', typeof WebAssembly !== 'undefined');
        console.log('Support WebGPU:', typeof extNavigator.gpu !== 'undefined');
        console.log('Support Web Workers:', typeof Worker !== 'undefined');
        console.log('Memory available:', typeof extNavigator.deviceMemory !== 'undefined' ? extNavigator.deviceMemory + 'GB' : 'Unknown');
        console.log('Retry attempt:', retryCount + 1, '/', maxRetries);
        console.log('Timeout per attempt:', timeoutMs, 'ms');
        
        // 在浏览器环境下加载模型，使用量化版本以提高性能
        // 添加更多调试信息，查看模型下载的URL和请求状态
        console.log('=== Model Loading Configuration ===');
        console.log('Model ID:', 'Xenova/all-MiniLM-L6-v2');
        console.log('Pipeline Type:', 'feature-extraction');
        console.log('Quantized:', true);
        
        // 使用Promise.race实现超时控制
        const pipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          progress_callback: (data: ProgressCallbackData) => {
            // console.log('进度数据:', JSON.stringify(data, null, 2));
            if (data.status) {
              console.log(`Status: ${data.status}${data.file ? ` - ${data.file}` : ''}${data.progress ? ` - ${data.progress}%` : ''}`);
              // 尝试获取更多关于下载的信息
              if (data.url) {
                console.log('Download URL:', data.url);
              }
            }
          },
        });
        
        // 超时Promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Model loading timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        });
        
        // 尝试使用Xenova提供的量化模型版本，这是专门为浏览器优化的
        // 使用Promise.race确保在超时时间内完成
        this.embedder = await Promise.race([pipelinePromise, timeoutPromise]);
        
        console.log('=== Model Initialization Complete ===');
        console.log('Embedder type:', typeof this.embedder);
        console.log('Embedder object keys:', this.embedder ? Object.keys(this.embedder) : 'undefined');
        
        this.initialized = true;
        this.useFallback = false;
        console.log('Embedding model initialized successfully');
        return; // 成功初始化，退出函数
      } catch (error) {
        // 增加重试计数
        retryCount++;
        
        // 添加更详细的错误信息
        console.error('=== Embedding Initialization Error ===');
        console.error('Error type:', typeof error);
        console.error('Error object:', error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : undefined);
        
        // 检查是否是特定的已知错误
        const errorStr = String(error);
        if (errorStr.includes('CORS')) {
          console.error('⚠️ 可能是CORS问题，请检查模型服务器的跨域配置');
        } else if (errorStr.includes('WebAssembly')) {
          console.error('⚠️ 可能是WebAssembly支持问题，请检查浏览器兼容性');
        } else if (errorStr.includes('memory')) {
          console.error('⚠️ 可能是内存不足问题，请关闭其他标签页或使用较小的模型');
        } else if (errorStr.includes('Unexpected token') && errorStr.includes('<!doctype')) {
          console.error('⚠️ 服务器返回了HTML页面而不是JSON数据，可能是404错误或CDN配置问题');
        } else if (errorStr.includes('timed out')) {
          console.error('⚠️ 模型加载超时，网络连接可能有问题或模型服务器响应缓慢');
        }
        
        // 检查是否还有重试机会
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 指数退避
          console.log(`Retrying in ${delay}ms... (Attempt ${retryCount + 1} of ${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.log(`Failed after ${maxRetries} attempts`);
          // 所有重试都失败，启用降级模式
          this.useFallback = true;
          console.log('Using fallback text search (model loading failed)');
        }
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.useFallback) {
      // 降级模式：返回一个简单的哈希向量
      return this.generateFallbackEmbedding(text);
    }

    if (!this.initialized) {
      await this.initialize();
      
      // 检查初始化后是否切换到了降级模式
      if (this.useFallback) {
        return this.generateFallbackEmbedding(text);
      }
    }

    try {
      // 确保 embedder 存在且是函数
      if (!this.embedder || typeof this.embedder !== 'function') {
        throw new Error('Embedder is not properly initialized');
      }
      
      const result = await this.embedder(text, {
        pooling: 'mean',
        normalize: true,
      });
      
      return Array.from(result.data);
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      // 切换到降级模式
      this.useFallback = true;
      return this.generateFallbackEmbedding(text);
    }
  }

  // 生成一个简单的哈希向量作为降级方案
  private generateFallbackEmbedding(text: string): number[] {
    // 使用简单的哈希函数生成固定长度的向量
    const hash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash;
    };

    // 生成一个128维的向量
    const vector: number[] = [];
    const lowerText = text.toLowerCase();
    
    for (let i = 0; i < 128; i++) {
      const segment = lowerText.slice(i * 2, (i + 1) * 2);
      vector.push((hash(segment) % 1000) / 1000);
    }

    return vector;
  }

  // 检查是否处于降级模式
  isUsingFallback(): boolean {
    return this.useFallback;
  }
}

export const embeddingService = new EmbeddingService();
