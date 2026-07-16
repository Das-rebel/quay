// ============================================================
// Query-Type Presets & Cost-Per-Query Tracking
// Based on TMLPD Priority Roadmap P1 & P2
//
// P1: Per-bucket provider+temp, productizes manual routing
// P2: Auto-route to cheapest adequate model
// ============================================================

export interface ModelProfile {
  provider: string;
  model: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  latencyMs: number;
  quality: number;         // 0-1 estimated quality
  strength: string[];       // ['code', 'reasoning', 'creative']
  contextWindow: number;
}

export interface QueryPreset {
  id: string;
  name: string;
  description: string;
  type: 'code' | 'reasoning' | 'creative' | 'quick' | 'critical' | 'general';
  models: ModelProfile[];
  temperature: number;
  maxTokens: number;
  budgetCap?: number;      // Max cost per query in USD
}

export interface CostRecord {
  timestamp: number;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  latencyMs: number;
  success: boolean;
  queryType: string;
}

// ============================================================
// Model Profiles Database
// ============================================================

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  // Anthropic
  'claude-3-5-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    latencyMs: 800,
    quality: 0.95,
    strength: ['reasoning', 'creative', 'code'],
    contextWindow: 200000,
  },
  'claude-3-haiku': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    latencyMs: 400,
    quality: 0.85,
    strength: ['quick', 'general'],
    contextWindow: 200000,
  },
  // OpenAI
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    latencyMs: 600,
    quality: 0.93,
    strength: ['code', 'reasoning', 'creative'],
    contextWindow: 128000,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    latencyMs: 300,
    quality: 0.82,
    strength: ['quick', 'general'],
    contextWindow: 128000,
  },
  // Google
  'gemini-2.5-flash': {
    provider: 'google',
    model: 'gemini-2.5-flash',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
    latencyMs: 400,
    quality: 0.85,
    strength: ['quick', 'general'],
    contextWindow: 1000000,
  },
  // Groq
  'llama-3.3-70b': {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    costPer1kInput: 0.0002,
    costPer1kOutput: 0.0002,
    latencyMs: 250,
    quality: 0.78,
    strength: ['quick', 'general'],
    contextWindow: 128000,
  },
  'llama-3.1-8b': {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    costPer1kInput: 0.00005,
    costPer1kOutput: 0.00008,
    latencyMs: 150,
    quality: 0.72,
    strength: ['quick', 'general'],
    contextWindow: 128000,
  },
  // Cerebras
  'cerebras-llama': {
    provider: 'cerebras',
    model: 'llama-3.3-70b',
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0001,
    latencyMs: 150,
    quality: 0.75,
    strength: ['quick', 'general'],
    contextWindow: 128000,
  },
};

// ============================================================
// Query-Type Presets
// ============================================================

export const QUERY_PRESETS: Record<string, QueryPreset> = {
  code: {
    id: 'code',
    name: 'Code Expert',
    description: 'Best for code generation, debugging, refactoring',
    type: 'code',
    models: [
      MODEL_PROFILES['claude-3-5-sonnet'],
      MODEL_PROFILES['gpt-4o'],
    ],
    temperature: 0.2,
    maxTokens: 4096,
  },
  reasoning: {
    id: 'reasoning',
    name: 'Deep Reasoning',
    description: 'Complex analysis, problem solving, step-by-step',
    type: 'reasoning',
    models: [
      MODEL_PROFILES['claude-3-5-sonnet'],
      MODEL_PROFILES['gpt-4o'],
    ],
    temperature: 0.3,
    maxTokens: 8192,
  },
  creative: {
    id: 'creative',
    name: 'Creative Writing',
    description: 'Storytelling, brainstorming, creative content',
    type: 'creative',
    models: [
      MODEL_PROFILES['claude-3-5-sonnet'],
      MODEL_PROFILES['gemini-2.5-flash'],
    ],
    temperature: 0.8,
    maxTokens: 4096,
  },
  quick: {
    id: 'quick',
    name: 'Quick & Cheap',
    description: 'Fast responses, low cost, simple queries',
    type: 'quick',
    models: [
      MODEL_PROFILES['gpt-4o-mini'],
      MODEL_PROFILES['llama-3.1-8b'],
      MODEL_PROFILES['gemini-2.5-flash'],
    ],
    temperature: 0.3,
    maxTokens: 2048,
    budgetCap: 0.001,  // 0.1 cents max
  },
  critical: {
    id: 'critical',
    name: 'Critical Tasks',
    description: 'High-stakes decisions, security, production changes',
    type: 'critical',
    models: [
      MODEL_PROFILES['claude-3-5-sonnet'],
      MODEL_PROFILES['gpt-4o'],
      MODEL_PROFILES['gemini-2.5-flash'],
    ],
    temperature: 0.1,
    maxTokens: 8192,
  },
  general: {
    id: 'general',
    name: 'General Purpose',
    description: 'Balanced for everyday tasks',
    type: 'general',
    models: [
      MODEL_PROFILES['gpt-4o-mini'],
      MODEL_PROFILES['claude-3-haiku'],
      MODEL_PROFILES['gemini-2.5-flash'],
    ],
    temperature: 0.4,
    maxTokens: 4096,
  },
};

// ============================================================
// Cost Tracker
// ============================================================

export class CostTracker {
  private records: CostRecord[] = [];
  private sessionId: string;
  private dailyBudget: number = 10.00;  // $10/day default
  private queryBudget: number = 0.50;    // $0.50 per query default

  constructor(sessionId: string = 'default') {
    this.sessionId = sessionId;
  }

  /**
   * Record a cost entry
   */
  record(record: Omit<CostRecord, 'timestamp'>): void {
    this.records.push({
      ...record,
      timestamp: Date.now(),
    });
  }

  /**
   * Estimate cost before query
   */
  estimateCost(
    model: string,
    provider: string,
    estimatedTokensIn: number,
    estimatedTokensOut: number
  ): number {
    const profile = MODEL_PROFILES[model];
    if (!profile) {
      // Default estimate
      return (estimatedTokensIn + estimatedTokensOut) / 1000 * 0.001;
    }
    return (
      (estimatedTokensIn / 1000) * profile.costPer1kInput +
      (estimatedTokensOut / 1000) * profile.costPer1kOutput
    );
  }

  /**
   * Check if query is within budget
   */
  canAfford(estimatedCost: number): boolean {
    const todaySpent = this.getTodayTotal();
    return (todaySpent + estimatedCost) <= this.dailyBudget;
  }

  /**
   * Get total spent today
   */
  getTodayTotal(): number {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    return this.records
      .filter(r => r.timestamp >= todayStart.getTime())
      .reduce((sum, r) => sum + r.costUSD, 0);
  }

  /**
   * Get cost breakdown by model
   */
  getCostByModel(): Record<string, { count: number; totalCost: number; avgLatency: number }> {
    const byModel: Record<string, { count: number; totalCost: number; avgLatency: number }> = {};
    
    for (const record of this.records) {
      if (!byModel[record.model]) {
        byModel[record.model] = { count: 0, totalCost: 0, avgLatency: 0 };
      }
      byModel[record.model].count++;
      byModel[record.model].totalCost += record.costUSD;
      byModel[record.model].avgLatency += record.latencyMs;
    }
    
    // Calculate averages
    for (const model of Object.keys(byModel)) {
      const stats = byModel[model];
      stats.avgLatency = stats.avgLatency / stats.count;
    }
    
    return byModel;
  }

  /**
   * Get cost breakdown by query type
   */
  getCostByQueryType(): Record<string, { count: number; totalCost: number }> {
    const byType: Record<string, { count: number; totalCost: number }> = {};
    
    for (const record of this.records) {
      if (!byType[record.queryType]) {
        byType[record.queryType] = { count: 0, totalCost: 0 };
      }
      byType[record.queryType].count++;
      byType[record.queryType].totalCost += record.costUSD;
    }
    
    return byType;
  }

  /**
   * Get full cost report
   */
  getReport(): {
    totalCost: number;
    totalQueries: number;
    todayCost: number;
    byModel: Record<string, { count: number; totalCost: number; avgLatency: number }>;
    byQueryType: Record<string, { count: number; totalCost: number }>;
    avgCostPerQuery: number;
    successRate: number;
    budgetRemaining: number;
  } {
    const totalCost = this.records.reduce((sum, r) => sum + r.costUSD, 0);
    const successful = this.records.filter(r => r.success).length;
    
    return {
      totalCost,
      totalQueries: this.records.length,
      todayCost: this.getTodayTotal(),
      byModel: this.getCostByModel(),
      byQueryType: this.getCostByQueryType(),
      avgCostPerQuery: this.records.length > 0 ? totalCost / this.records.length : 0,
      successRate: this.records.length > 0 ? successful / this.records.length : 0,
      budgetRemaining: this.dailyBudget - this.getTodayTotal(),
    };
  }

  /**
   * Set budget limits
   */
  setBudget(daily: number, perQuery: number): void {
    this.dailyBudget = daily;
    this.queryBudget = perQuery;
  }

  /**
   * Reset all records
   */
  reset(): void {
    this.records = [];
  }

  /**
   * Export records as JSON
   */
  export(): CostRecord[] {
    return [...this.records];
  }
}

// ============================================================
// Query Classifier
// ============================================================

const QUERY_TYPE_PATTERNS = {
  code: [
    'code', 'function', 'class', 'debug', 'implement', 'refactor',
    'bug', 'error', 'api', 'sql', 'database', 'script', 'algorithm'
  ],
  reasoning: [
    'why', 'how', 'analyze', 'compare', 'evaluate', 'determine',
    'explain', 'reason', 'think', 'logic', 'prove', 'hypothesis'
  ],
  creative: [
    'write', 'story', 'creative', 'brainstorm', 'imagine', 'design',
    'invent', 'compose', 'poem', 'song', 'art'
  ],
  quick: [
    'what is', 'define', 'quick', 'simple', 'brief', 'summary',
    'translate', 'convert', 'calculate'
  ],
  critical: [
    'deploy', 'production', 'security', 'critical', 'important',
    'urgent', 'emergency', 'backup', 'restore'
  ],
};

export function classifyQuery(query: string): string {
  const lower = query.toLowerCase();
  
  // Check patterns in order of specificity
  if (QUERY_TYPE_PATTERNS.critical.some(p => lower.includes(p))) return 'critical';
  if (QUERY_TYPE_PATTERNS.code.some(p => lower.includes(p))) return 'code';
  if (QUERY_TYPE_PATTERNS.reasoning.some(p => lower.includes(p))) return 'reasoning';
  if (QUERY_TYPE_PATTERNS.creative.some(p => lower.includes(p))) return 'creative';
  if (QUERY_TYPE_PATTERNS.quick.some(p => lower.includes(p))) return 'quick';
  
  return 'general';
}

// ============================================================
// Routing with Presets
// ============================================================

export function selectModelForQuery(
  query: string,
  options?: {
    preferSpeed?: boolean;
    budgetCap?: number;
    minQuality?: number;
  }
): { preset: QueryPreset; model: ModelProfile } {
  // Classify query type
  const queryType = classifyQuery(query);
  const preset = QUERY_PRESETS[queryType] || QUERY_PRESETS.general;
  
  // Filter by budget if specified
  let models = preset.models;
  if (options?.budgetCap !== undefined) {
    const budgetCap = options.budgetCap;
    models = models.filter(m => {
      const estimated = (1000 / 1000) * m.costPer1kInput + (500 / 1000) * m.costPer1kOutput;
      return estimated <= budgetCap;
    });
  }
  
  // Filter by minimum quality if specified
  if (options?.minQuality) {
    models = models.filter(m => m.quality >= options.minQuality!);
  }
  
  // Sort by preference
  if (options?.preferSpeed) {
    models = models.sort((a, b) => a.latencyMs - b.latencyMs);
  } else {
    models = models.sort((a, b) => b.quality - a.quality);
  }
  
  const selected = models[0];
  
  if (!selected) {
    // Fallback to cheapest
    return { preset, model: preset.models[preset.models.length - 1] };
  }
  
  return { preset, model: selected };
}

// ============================================================
// Convenience export
// ============================================================

export const costTracker = new CostTracker();
