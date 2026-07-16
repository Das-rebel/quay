// ============================================================
// Quay — Marketing Module Configuration
// Registers marketic as an MCP tool provider and defines the
// marketing intelligence agent + query presets + ensemble configs.
// ============================================================

import type { MCPServerConfig, AgentType } from '../../lib/types/index.js';
import {
  MODEL_PROFILES,
  type QueryPreset,
} from '../../lib/routing.js';
import type { EnsembleConfig } from '../../lib/ensemble.js';

// ----------------------------------------------------------------
// Marketic MCP Server Configuration
// ----------------------------------------------------------------

export const MARKETIC_MCP_CONFIG: MCPServerConfig = {
  name: 'marketic',
  command: 'python3',
  args: ['/Users/Subho/marketic/mcp_server.py'],
  env: {
    MARKETIC_DB_PATH: process.env.MARKETIC_DB_PATH ?? './marketic_memory.db',
    // Pass through API keys for LLM-powered marketing analysis
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  },
};

// ----------------------------------------------------------------
// Marketing Tool Catalog (for reference / UI display)
// The marketic MCP server exposes these via tools/list at runtime.
// ----------------------------------------------------------------

export const MARKETIC_TOOLS = [
  {
    name: 'analyze_competitor',
    description: 'Deep-dive analysis of a competitor: positioning, messaging, ad strategy, audience targeting, and gaps.',
  },
  {
    name: 'generate_creatives',
    description: 'Generate ad creatives (headlines, copy, visual concepts) for a given campaign brief and channel.',
  },
  {
    name: 'generate_social_posts',
    description: 'Generate platform-specific social media posts (LinkedIn, X/Twitter, Instagram, Facebook) from a campaign narrative.',
  },
  {
    name: 'build_campaign',
    description: 'Assemble a full campaign plan: audience segments, channels, messaging hierarchy, creative variants, and timeline.',
  },
  {
    name: 'optimize_budget',
    description: 'Optimize budget allocation across channels and segments using historical performance and attribution data.',
  },
  {
    name: 'analyze_positioning',
    description: 'Analyze brand positioning relative to competitors: perceptual map, value proposition gaps, and differentiation opportunities.',
  },
  {
    name: 'collect_signals',
    description: 'Collect market intelligence signals: competitor ad spend, social mentions, search trends, and sentiment.',
  },
  {
    name: 'get_attribution',
    description: 'Retrieve multi-touch attribution data for active campaigns: channel ROI, CAC, LTV, and conversion paths.',
  },
  {
    name: 'launch_campaign_ad',
    description: 'Launch a campaign ad on a connected platform (Meta Ads, Google Ads, LinkedIn Ads). Requires human approval.',
  },
  {
    name: 'generate_narrative',
    description: 'Synthesize a cohesive brand/campaign narrative from competitor analysis, positioning gaps, and creative assets.',
  },
] as const;

// ----------------------------------------------------------------
// Marketing Query Presets
// Extends quay's QUERY_PRESETS with marketing-specific routing.
// ----------------------------------------------------------------

export const MARKETING_QUERY_PRESETS: Record<string, QueryPreset> = {
  competitor_analysis: {
    id: 'competitor_analysis',
    name: 'Competitor Analysis',
    description: 'Deep competitive intelligence: positioning, messaging, ad strategy, and gap analysis',
    type: 'reasoning',
    models: [
      MODEL_PROFILES['claude-3-5-sonnet']!,
      MODEL_PROFILES['gpt-4o']!,
    ],
    temperature: 0.3,
    maxTokens: 8192,
  },

  creative_generation: {
    id: 'creative_generation',
    name: 'Creative Generation',
    description: 'Ad copy, headlines, social posts, and visual concepts for campaigns',
    type: 'creative',
    models: [
      MODEL_PROFILES['claude-3-5-sonnet']!,
      MODEL_PROFILES['gemini-2.5-flash']!,
    ],
    temperature: 0.9,
    maxTokens: 4096,
  },

  campaign_strategy: {
    id: 'campaign_strategy',
    name: 'Campaign Strategy',
    description: 'High-stakes campaign planning: budget allocation, channel mix, audience segmentation',
    type: 'critical',
    models: [
      MODEL_PROFILES['claude-3-5-sonnet']!,
      MODEL_PROFILES['gpt-4o']!,
    ],
    temperature: 0.2,
    maxTokens: 8192,
    budgetCap: 0.05,
  },

  performance_analytics: {
    id: 'performance_analytics',
    name: 'Performance Analytics',
    description: 'Attribution analysis, ROI calculation, and performance reporting — cost-optimized',
    type: 'quick',
    models: [
      MODEL_PROFILES['gpt-4o-mini']!,
      MODEL_PROFILES['llama-3.3-70b']!,
    ],
    temperature: 0.2,
    maxTokens: 4096,
    budgetCap: 0.002,
  },
};

// ----------------------------------------------------------------
// Marketing Ensemble Presets
// Pre-configured EnsembleConfig objects for different quality/cost/speed tradeoffs.
// ----------------------------------------------------------------

export const MARKETING_ENSEMBLE_PRESETS: Record<string, EnsembleConfig> = {
  // Quality-first: best models, confidence-weighted merge
  quality: {
    models: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', weight: 1.0 },
      { provider: 'openai', model: 'gpt-4o', weight: 0.9 },
    ],
    votingStrategy: 'confidence',
    mergeStrategy: 'weighted',
    maxTokens: 8192,
    timeoutMs: 120_000,
  },

  // Speed-first: fast models, majority vote, best-result merge
  speed: {
    models: [
      { provider: 'openai', model: 'gpt-4o-mini', weight: 1.0 },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', weight: 0.8 },
    ],
    votingStrategy: 'majority',
    mergeStrategy: 'best',
    maxTokens: 4096,
    timeoutMs: 30_000,
  },

  // Cost-first: cheapest adequate models
  cost: {
    models: [
      { provider: 'openai', model: 'gpt-4o-mini', weight: 1.0 },
      { provider: 'google', model: 'gemini-2.5-flash', weight: 0.9 },
    ],
    votingStrategy: 'majority',
    mergeStrategy: 'best',
    maxTokens: 4096,
    timeoutMs: 60_000,
  },
};

// ----------------------------------------------------------------
// Marketing Agent Definition
// ----------------------------------------------------------------

export type MarketingEnsembleMode = 'quality' | 'speed' | 'cost';

export interface MarketingAgentDefinition {
  id: string;
  name: string;
  type: AgentType;
  tools: string[];
  instructions: string;
  requireVerification: string[];
  ensemble: MarketingEnsembleMode;
}

export const MARKETING_AGENT: MarketingAgentDefinition = {
  id: 'marketing-agent',
  name: 'Marketing Intelligence Agent',
  type: 'RESEARCHER',

  tools: [
    'marketic::analyze_competitor',
    'marketic::generate_creatives',
    'marketic::generate_social_posts',
    'marketic::build_campaign',
    'marketic::optimize_budget',
    'marketic::analyze_positioning',
    'marketic::collect_signals',
    'marketic::get_attribution',
    'marketic::launch_campaign_ad',
    'marketic::generate_narrative',
  ],

  instructions: `You are a Marketing Intelligence Agent powered by the marketic tool suite.

Your mission is to help users understand their competitive landscape, craft compelling campaigns, and launch them with data-driven confidence.

## Core Capabilities

1. **Competitor Analysis** — Use \`analyze_competitor\` and \`analyze_positioning\` to map the competitive landscape. Always identify: (a) competitor positioning, (b) messaging patterns, (c) audience targeting gaps, (d) differentiation opportunities.

2. **Signal Collection** — Use \`collect_signals\` to gather real-time market intelligence: ad spend trends, social sentiment, and search volume shifts.

3. **Creative Generation** — Use \`generate_creatives\` and \`generate_social_posts\` to produce channel-specific ad copy. Tailor tone and format to each platform. Always provide 3+ variants for A/B testing.

4. **Campaign Building** — Use \`build_campaign\` to assemble a complete campaign plan: audience segments, channels, messaging hierarchy, creative variants, and timeline.

5. **Budget Optimization** — Use \`optimize_budget\` to allocate spend across channels using attribution data. Prioritize ROI over reach when budget is constrained.

6. **Narrative Synthesis** — Use \`generate_narrative\` to weave competitor insights, positioning gaps, and creative assets into a cohesive campaign story.

7. **Performance Tracking** — Use \`get_attribution\` to retrieve multi-touch attribution data and report on channel ROI, CAC, and LTV.

8. **Campaign Launch** — Use \`launch_campaign_ad\` to deploy ads to connected platforms. This action SPENDS MONEY and always requires human verification.

## Operating Principles

- **Evidence-first**: Never make claims about competitors without calling \`collect_signals\` or \`analyze_competitor\` first.
- **Multi-variant**: Always generate 3+ creative variants for testing. Never present a single option.
- **Budget-conscious**: Flag any action that will incur ad spend. Never launch without explicit approval.
- **Channel-aware**: Tailor creative to platform conventions (LinkedIn = professional, Instagram = visual, X = punchy).
- **Iterative**: If a campaign underperforms, use \`get_attribution\` to diagnose and \`optimize_budget\` to reallocate.

## Output Format

For analysis tasks, structure your response as:
1. **Key Findings** — Bullet-pointed insights with evidence
2. **Strategic Implications** — What this means for the user
3. **Recommended Actions** — Specific, prioritized next steps

For creative tasks, provide variants labeled [Variant A], [Variant B], [Variant C] with brief rationale for each.`,

  // HITL: Any tool that spends money or launches public-facing content requires verification
  requireVerification: [
    'marketic::launch_campaign_ad',
  ],

  // Use quality ensemble for marketing reasoning (analysis + strategy)
  ensemble: 'quality',
};
