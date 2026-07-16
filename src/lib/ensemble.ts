// ============================================================
// Parallel Ensemble Executor with Confidence-Weighted Voting
// Based on A3M/TMLPD architecture
//
// Key Innovation: Call multiple models SIMULTANEOUSLY and merge
// results with confidence weights. NOT sequential fallback.
//
// Competitors (litellm, one-api) all do sequential fallback only.
// This is the unique differentiator.
// ============================================================

import { calculateCost, estimateTokens } from './a3m.js';

export interface ModelResponse {
  model: string;
  provider: string;
  content: string;
  confidence: number;      // 0-1 how confident model is in answer
  costUSD: number;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  isCorrect?: boolean;     // For training feedback
}

export interface EnsembleConfig {
  models: Array<{
    provider: string;
    model: string;
    weight?: number;       // Base weight (0-1), default 1.0
  }>;
  votingStrategy: 'confidence' | 'shapley' | 'majority';
  mergeStrategy: 'concat' | 'best' | 'weighted';
  maxTokens?: number;
  timeoutMs?: number;
  alpha?: number;          // Shapley weight
  beta?: number;          // Loyalty weight  
  gamma?: number;         // Handicap weight
}

export interface VotingResult {
  content: string;
  winner: string;
  confidence: number;
  votes: Array<{ model: string; vote: number; content: string }>;
  shapleyScores?: Map<string, number>;
  totalCost: number;
  totalLatencyMs: number;
}

// ============================================================
// Confidence Calculator
// ============================================================

export function calculateConfidence(
  content: string,
  model: string,
  latencyMs: number
): number {
  let confidence = 0.8; // Base confidence
  
  // Length-based confidence (not too short, not too long)
  const words = content.split(/\s+/).length;
  if (words < 5) confidence *= 0.7;
  else if (words > 500) confidence *= 0.9;
  else confidence *= 1.0;
  
  // Model-based adjustments
  if (model.includes('claude-3-5-sonnet')) confidence *= 1.1;
  else if (model.includes('gpt-4o')) confidence *= 1.05;
  else if (model.includes('haiku') || model.includes('mini')) confidence *= 0.95;
  
  // Latency-based (faster = more confident usually)
  if (latencyMs < 500) confidence *= 1.05;
  else if (latencyMs > 5000) confidence *= 0.9;
  
  return Math.min(1.0, confidence);
}

// ============================================================
// Loyalty Matrix (from A3M ensemble module)
// Models develop trust through successful collaborations
// ============================================================

export class LoyaltyMatrix {
  private matrix: Map<string, Map<string, number>> = new Map();
  private counts: Map<string, Map<string, number>> = new Map();
  private config = { decayRate: 0.9, minInteractions: 3 };

  recordSuccess(modelI: string, modelJ: string, weight: number = 1): void {
    if (!this.matrix.has(modelI)) {
      this.matrix.set(modelI, new Map());
      this.counts.set(modelI, new Map());
    }
    const prev = this.matrix.get(modelI)!.get(modelJ) || 0;
    const ema = this.config.decayRate * prev + (1 - this.config.decayRate) * weight;
    this.matrix.get(modelI)!.set(modelJ, ema);
    this.counts.get(modelI)!.set(modelJ, (this.counts.get(modelI)!.get(modelJ) || 0) + 1);
  }

  getLoyalty(modelI: string, modelJ: string): number {
    if (!this.matrix.has(modelI) || !this.matrix.get(modelI)!.has(modelJ)) return 0;
    if ((this.counts.get(modelI)!.get(modelJ) || 0) < this.config.minInteractions) return 0;
    return this.matrix.get(modelI)!.get(modelJ)!;
  }

  ethnoCentrism(model: string, allModels: string[]): number {
    const loyalties = allModels.map(m => this.getLoyalty(model, m));
    const avg = loyalties.reduce((a, b) => a + b, 0) / Math.max(1, loyalties.length);
    return Math.min(1, avg);
  }
}

// ============================================================
// Handicap Calculator (from A3M ensemble module)
// Zahavi 1975: Costly signals = honest signals
// ============================================================

export class HandicapCalculator {
  private costs: Map<string, number> = new Map();
  private correct: Map<string, number> = new Map();
  private totals: Map<string, number> = new Map();
  private config = { costSensitivity: 0.5, reliabilityWeight: 0.5, minCostThreshold: 0.0001 };

  record(model: string, cost: number, isCorrect: boolean): void {
    this.costs.set(model, (this.costs.get(model) || 0) + cost);
    this.totals.set(model, (this.totals.get(model) || 0) + 1);
    if (isCorrect) this.correct.set(model, (this.correct.get(model) || 0) + 1);
  }

  reliability(model: string): number {
    const total = this.totals.get(model) || 0;
    if (total === 0) return 0.5;
    return (this.correct.get(model) || 0) / total;
  }

  avgCost(model: string): number {
    const total = this.totals.get(model) || 0;
    if (total === 0) return 0;
    return (this.costs.get(model) || 0) / total;
  }

  handicap(model: string, maxCost: number = 0.01): number {
    const cost = this.avgCost(model);
    if (cost < this.config.minCostThreshold) return 0;
    const rel = this.reliability(model);
    const costNorm = Math.min(1, cost / maxCost);
    return this.config.costSensitivity * costNorm * rel + this.config.reliabilityWeight * rel;
  }
}

// ============================================================
// Parallel Ensemble Executor
// ============================================================

export class EnsembleOrchestrator {
  private loyaltyMatrix = new LoyaltyMatrix();
  private handicapCalculator = new HandicapCalculator();
  private config: Required<EnsembleConfig>;

  constructor(config: EnsembleConfig) {
    this.config = {
      votingStrategy: config.votingStrategy || 'confidence',
      mergeStrategy: config.mergeStrategy || 'best',
      maxTokens: config.maxTokens || 4096,
      timeoutMs: config.timeoutMs || 30000,
      alpha: config.alpha || 0.6,    // Shapley weight
      beta: config.beta || 0.25,     // Loyalty weight
      gamma: config.gamma || 0.15,   // Handicap weight
      models: config.models,
    };
  }

  /**
   * Execute ensemble: call all models in parallel
   */
  async executeEnsemble(
    prompt: string,
    systemPrompt: string,
    apiKeys: Record<string, string>,
    baseURLs: Record<string, string>
  ): Promise<ModelResponse[]> {
    const promises = this.config.models.map(async (modelConfig) => {
      const startTime = Date.now();
      try {
        const result = await this.callModel(
          prompt,
          systemPrompt,
          modelConfig,
          apiKeys[modelConfig.provider],
          baseURLs[modelConfig.provider]
        );
        return result;
      } catch (error) {
        console.error(`Model ${modelConfig.model} failed:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    return results
      .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
  }

  /**
   * Call a single model
   */
  private async callModel(
    prompt: string,
    systemPrompt: string,
    modelConfig: { provider: string; model: string; weight?: number },
    apiKey: string | undefined,
    baseURL: string
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };

    const body = {
      model: modelConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: this.config.maxTokens,
      temperature: 0.2,
    };

    const url = `${baseURL}/v1/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const content = data.choices[0]?.message?.content ?? '';
    const latencyMs = Date.now() - startTime;
    const tokensIn = data.usage?.prompt_tokens ?? estimateTokens(prompt);
    const tokensOut = data.usage?.completion_tokens ?? estimateTokens(content);
    const costUSD = calculateCost(modelConfig.model, tokensIn, tokensOut);
    const confidence = calculateConfidence(content, modelConfig.model, latencyMs);

    return {
      model: modelConfig.model,
      provider: modelConfig.provider,
      content,
      confidence,
      costUSD,
      latencyMs,
      tokensIn,
      tokensOut,
    };
  }

  /**
   * Vote on results using configured strategy
   */
  vote(responses: ModelResponse[]): VotingResult {
    if (responses.length === 0) {
      throw new Error('No responses to vote on');
    }

    if (responses.length === 1) {
      return {
        content: responses[0].content,
        winner: responses[0].model,
        confidence: responses[0].confidence,
        votes: [{ model: responses[0].model, vote: 1, content: responses[0].content }],
        totalCost: responses.reduce((sum, r) => sum + r.costUSD, 0),
        totalLatencyMs: Math.max(...responses.map(r => r.latencyMs)),
      };
    }

    switch (this.config.votingStrategy) {
      case 'confidence':
        return this.confidenceVote(responses);
      case 'shapley':
        return this.shapleyVote(responses);
      case 'majority':
        return this.majorityVote(responses);
      default:
        return this.confidenceVote(responses);
    }
  }

  /**
   * Confidence-weighted voting
   */
  private confidenceVote(responses: ModelResponse[]): VotingResult {
    // Weight by confidence × base weight
    const votes = responses.map(r => ({
      model: r.model,
      content: r.content,
      vote: r.confidence * (r.confidence), // Square for sharper differentiation
      rawConfidence: r.confidence,
    }));

    const totalVotes = votes.reduce((sum, v) => sum + v.vote, 0);
    votes.forEach(v => v.vote = v.vote / totalVotes);

    const winner = votes.reduce((best, v) => v.vote > best.vote ? v : best, votes[0]);

    return {
      content: winner.content,
      winner: winner.model,
      confidence: winner.rawConfidence,
      votes,
      totalCost: responses.reduce((sum, r) => sum + r.costUSD, 0),
      totalLatencyMs: Math.max(...responses.map(r => r.latencyMs)),
    };
  }

  /**
   * Shapley value-based voting with loyalty and handicap
   */
  private shapleyVote(responses: ModelResponse[]): VotingResult {
    const modelIds = responses.map(r => r.model);
    const shapleyScores = new Map<string, number>();

    // Calculate Shapley values
    for (const model of modelIds) {
      let shapley = 0;
      const n = modelIds.length;
      
      // Simplified Shapley: marginal contribution to ensemble accuracy
      for (let i = 0; i < n; i++) {
        const otherModels = modelIds.filter((_, idx) => idx !== i);
        const withoutMe = this.ensembleAccuracy(otherModels, responses);
        const withMe = this.ensembleAccuracy(modelIds, responses);
        const marginal = withMe - withoutMe;
        
        // Shapley coefficient
        const coef = this.schapleyCoefficient(n, i);
        shapley += coef * marginal;
      }
      
      shapleyScores.set(model, Math.max(0, shapley));
    }

    // Normalize Shapley scores
    const totalShapley = Array.from(shapleyScores.values()).reduce((a, b) => a + b, 0);
    if (totalShapley > 0) {
      for (const [model, score] of shapleyScores) {
        shapleyScores.set(model, score / totalShapley);
      }
    }

    // Apply loyalty and handicap adjustments
    const adjustedScores = new Map<string, number>();
    for (const model of modelIds) {
      const loyalty = this.loyaltyMatrix.ethnoCentrism(model, modelIds);
      const handicap = this.handicapCalculator.handicap(model);
      
      const baseShapley = shapleyScores.get(model) || 0;
      const adjusted = 
        this.config.alpha * baseShapley +
        this.config.beta * loyalty +
        this.config.gamma * handicap;
      
      adjustedScores.set(model, adjusted);
    }

    // Convert to votes
    const votes = modelIds.map(model => ({
      model,
      content: responses.find(r => r.model === model)!.content,
      vote: adjustedScores.get(model) || 0,
      shapley: shapleyScores.get(model) || 0,
      loyalty: this.loyaltyMatrix.ethnoCentrism(model, modelIds),
      handicap: this.handicapCalculator.handicap(model),
    }));

    const winner = votes.reduce((best, v) => v.vote > best.vote ? v : best, votes[0]);

    return {
      content: winner.content,
      winner: winner.model,
      confidence: winner.vote,
      votes,
      shapleyScores: adjustedScores,
      totalCost: responses.reduce((sum, r) => sum + r.costUSD, 0),
      totalLatencyMs: Math.max(...responses.map(r => r.latencyMs)),
    };
  }

  /**
   * Majority voting (simplified text matching)
   */
  private majorityVote(responses: ModelResponse[]): VotingResult {
    const votes = responses.map(r => ({
      model: r.model,
      content: r.content,
      vote: 1 / responses.length, // Equal vote
      rawConfidence: r.confidence,
    }));

    // For text, pick the longest most confident response as proxy
    const winner = responses.reduce((best, r) => {
      if (r.confidence > best.confidence) return r;
      if (r.confidence === best.confidence && r.content.length > best.content.length) return r;
      return best;
    }, responses[0]);

    return {
      content: winner.content,
      winner: winner.model,
      confidence: winner.confidence,
      votes,
      totalCost: responses.reduce((sum, r) => sum + r.costUSD, 0),
      totalLatencyMs: Math.max(...responses.map(r => r.latencyMs)),
    };
  }

  /**
   * Simplified ensemble accuracy (for Shapley)
   */
  private ensembleAccuracy(modelIds: string[], responses: ModelResponse[]): number {
    if (modelIds.length === 0) return 0;
    
    const relevantResponses = responses.filter(r => modelIds.includes(r.model));
    if (relevantResponses.length === 0) return 0;
    
    // Average confidence as proxy for accuracy
    return relevantResponses.reduce((sum, r) => sum + r.confidence, 0) / relevantResponses.length;
  }

  /**
   * Shapley coefficient for n models
   */
  private schapleyCoefficient(n: number, i: number): number {
    return 1 / n;
  }

  /**
   * Record feedback for learning
   */
  recordFeedback(
    responses: ModelResponse[],
    isCorrect: Record<string, boolean>
  ): void {
    for (const [model, correct] of Object.entries(isCorrect)) {
      const response = responses.find(r => r.model === model);
      if (response) {
        this.loyaltyMatrix.recordSuccess(model, model, correct ? 1 : 0);
        this.handicapCalculator.record(model, response.costUSD, correct);
      }
    }
  }

  /**
   * Get current routing statistics
   */
  getStats(): Record<string, unknown> {
    return {
      loyaltyMatrix: 'adaptive',
      handicapCalculator: 'adaptive',
      votingStrategy: this.config.votingStrategy,
      mergeStrategy: this.config.mergeStrategy,
    };
  }
}

// ============================================================
// Convenience function
// ============================================================

export async function ensembleQuery(
  prompt: string,
  systemPrompt: string,
  config: EnsembleConfig,
  apiKeys: Record<string, string>,
  baseURLs: Record<string, string>
): Promise<VotingResult> {
  const orchestrator = new EnsembleOrchestrator(config);
  const responses = await orchestrator.executeEnsemble(prompt, systemPrompt, apiKeys, baseURLs);
  
  if (responses.length === 0) {
    throw new Error('All models failed');
  }
  
  return orchestrator.vote(responses);
}
