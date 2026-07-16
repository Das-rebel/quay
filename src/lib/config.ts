// ============================================================
// Environment Configuration
// ============================================================

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  openAiApiKey?: string;
  embeddingEndpoint?: string;
  embeddingProvider: 'openai' | 'local' | 'mock';
  sseEnabled: boolean;
  dbPath: string;
}

function getEnv(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}

export const config: AppConfig = {
  env: getEnv(),
  openAiApiKey: process.env.OPENAI_API_KEY,
  embeddingEndpoint: process.env.EMBEDDING_ENDPOINT || 'http://localhost:11434/api/embeddings',
  embeddingProvider: (process.env.EMBEDDING_PROVIDER as 'openai' | 'local' | 'mock') || 'mock',
  sseEnabled: process.env.SSE_ENABLED !== 'false',
  dbPath: process.env.QUAY_DB_PATH || './quay.db',
};

export function isServer(): boolean {
  return typeof window === 'undefined';
}

export function isDevelopment(): boolean {
  return config.env === 'development';
}

export function isProduction(): boolean {
  return config.env === 'production';
}
