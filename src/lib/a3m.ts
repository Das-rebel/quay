// ============================================================
// A3M Router Integration
// Adaptive Multi-Model Router for intelligent routing
// ============================================================

import { isServer, config } from './config';

export interface A3MRouter {
  routeQuery(params: {
    query: string;
    task?: string;
    budget?: number;
    preferSpeed?: boolean;
    providers?: string[];
  }): Promise<{
    provider: string;
    model: string;
    reasoning: string;
    costEstimate: number;
    latencyEstimate: number;
  }>;
  
  getProviderHealth(): Promise<Record<string, {
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    costPer1kTokens: number;
  }>>;
  
  trackCost(inputTokens: number, outputTokens: number, model: string): void;
}

let routerInstance: A3MRouter | null = null;

async function createRouter(): Promise<A3MRouter> {
  const { routeQuery, getProviderHealth, CostTracker } = await import('adaptive-memory-multi-model-router');
  
  const costTracker = new CostTracker({
    monthly_limit: 10.00, // $10 monthly budget
  });
  
  // Set up budget alert
  costTracker.onAlert((alert: any) => {
    console.warn(`A3M Budget alert:`, alert);
  });
  
  return {
    async routeQuery(params) {
      const result = routeQuery(
        params.query,
        params.providers,
        params.budget
      );
      
      return {
        provider: result.primary_model?.split('/')[0] || 'unknown',
        model: result.primary_model || 'unknown',
        reasoning: result.reasoning || 'A3M routed query',
        costEstimate: result.estimated_cost || 0,
        latencyEstimate: result.estimated_latency_ms || 0,
      };
    },
    
    async getProviderHealth() {
      const health = await getProviderHealth();
      return health;
    },
    
    trackCost(inputTokens: number, outputTokens: number, model: string) {
      costTracker.record('default', model, inputTokens, outputTokens);
    },
  };
}

export async function getRouter(): Promise<A3MRouter> {
  if (!isServer()) {
    // Client-side: return mock router
    return {
      async routeQuery(params) {
        return {
          provider: 'mock',
          model: 'mock-model',
          reasoning: 'Client-side mock - no routing',
          costEstimate: 0,
          latencyEstimate: 0,
        };
      },
      async getProviderHealth() {
        return {
          mock: { status: 'healthy', latencyMs: 0, costPer1kTokens: 0 },
        };
      },
      trackCost(_inputTokens, _outputTokens, _model) {},
    };
  }
  
  if (!routerInstance) {
    routerInstance = await createRouter();
  }
  return routerInstance;
}

// Convenience function for simple routing decisions
export async function routeForTask(task: string): Promise<{
  provider: string;
  model: string;
  estimatedCost: number;
}> {
  const router = await getRouter();
  const result = await router.routeQuery({
    query: `Execute task: ${task}`,
    task,
    budget: 0.10, // 10 cents max
    preferSpeed: true,
  });
  
  return {
    provider: result.provider,
    model: result.model,
    estimatedCost: result.costEstimate,
  };
}

// Re-export estimateTokens from the package for ensemble compatibility
export { estimateTokens } from 'adaptive-memory-multi-model-router';

// Calculate cost for a given operation
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Use CostTracker.calculateCost if available
  const rates: Record<string, { input: number; output: number }> = {
    'openai/gpt-4': { input: 0.03, output: 0.06 },
    'openai/gpt-4o': { input: 0.005, output: 0.015 },
    'openai/gpt-3.5-turbo': { input: 0.001, output: 0.002 },
    'anthropic/claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
    'google/gemini-pro': { input: 0.001, output: 0.002 },
    'google/gemini-1.5-flash': { input: 0.00035, output: 0.00053 },
    'mock': { input: 0, output: 0 },
  };
  
  const rate = rates[model] || { input: 0.01, output: 0.01 };
  return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
}

// Estimate cost for a given operation (legacy function)
export function estimateCost(tokens: number, provider: string): number {
  const rates: Record<string, number> = {
    'openai/gpt-4': 0.03, // $0.03 per 1K tokens
    'openai/gpt-3.5-turbo': 0.002,
    'anthropic/claude-3-opus': 0.015,
    'google/gemini-pro': 0.001,
    'mock': 0,
  };
  
  const rate = rates[provider] || 0.01;
  return (tokens / 1000) * rate;
}
