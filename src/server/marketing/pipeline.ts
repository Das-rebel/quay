// ============================================================
// Quay — Marketing Pipeline Templates
// Pre-configured multi-stage workflows for marketing campaigns.
// ============================================================

import type { Pipeline } from '../../lib/types/index.js';

// ----------------------------------------------------------------
// Competitor Counter-Campaign Pipeline
//
// Workflow: Analyze competitor → Generate creatives → Build campaign → Launch
//
// This is the flagship marketing pipeline. It takes a competitor
// (or competitive threat) as input and produces a launched
// counter-campaign with human approval at the launch gate.
// ----------------------------------------------------------------

export const COMPETITOR_COUNTER_CAMPAIGN_PIPELINE: Pipeline = {
  id: 'competitor-counter-campaign',
  name: 'Competitor Counter-Campaign',
  description:
    'Analyze competitor positioning and strategy → Generate differentiated creatives → ' +
    'Build a full campaign plan → Launch with human approval',

  stages: [
    // ── Stage 1: Competitor Analysis ──────────────────────────
    {
      id: 'analyze',
      name: 'Competitor Analysis',
      agentType: 'RESEARCHER',
      instructions: `You are performing Stage 1 of a competitor counter-campaign pipeline.

Given the target competitor, execute a thorough competitive analysis:

1. Call \`marketic::analyze_competitor\` with the competitor name and relevant context.
2. Call \`marketic::analyze_positioning\` to map their brand positioning relative to the user's brand.
3. Call \`marketic::collect_signals\` to gather real-time market intelligence (ad spend, social sentiment, search trends).

Synthesize all findings into a structured report:
- **Competitor Overview**: Who they are, market position, target audience
- **Messaging Analysis**: Key value propositions, tone, positioning claims
- **Ad Strategy**: Channels, creative patterns, targeting approach
- **Strengths & Weaknesses**: Where they excel, where they're vulnerable
- **Differentiation Opportunities**: Gaps the user can exploit

This report feeds into creative generation. Be specific and evidence-based.`,
      tools: [
        'marketic::analyze_competitor',
        'marketic::analyze_positioning',
        'marketic::collect_signals',
      ],
      requiresApproval: false,
      timeoutMs: 120_000,
    },

    // ── Stage 2: Creative Generation ──────────────────────────
    {
      id: 'generate',
      name: 'Creative Generation',
      agentType: 'RESEARCHER',
      instructions: `You are performing Stage 2 of a competitor counter-campaign pipeline.

Using the competitor analysis report from Stage 1, generate differentiated marketing creatives:

1. Call \`marketic::generate_creatives\` to produce ad copy (headlines, body copy, CTA) that directly counter the competitor's positioning. Request variants for each target channel.
2. Call \`marketic::generate_social_posts\` to create platform-specific social posts (LinkedIn, X/Twitter, Instagram, Facebook) from the campaign angle.
3. Call \`marketic::generate_narrative\` to synthesize a cohesive brand narrative that ties the creatives together.

Requirements:
- Generate at least 3 creative variants per channel for A/B testing
- Each variant should exploit a specific differentiation opportunity identified in Stage 1
- Tailor tone to platform conventions
- Include a clear call-to-action in every creative

Output a creative brief with all variants labeled and rationalized.`,
      tools: [
        'marketic::generate_creatives',
        'marketic::generate_social_posts',
        'marketic::generate_narrative',
      ],
      requiresApproval: false,
      timeoutMs: 120_000,
    },

    // ── Stage 3: Campaign Strategy & Budget ───────────────────
    {
      id: 'strategy',
      name: 'Campaign Strategy & Budget',
      agentType: 'RESEARCHER',
      instructions: `You are performing Stage 3 of a competitor counter-campaign pipeline.

Using the creative assets from Stage 2, build the full campaign plan:

1. Call \`marketic::build_campaign\` to assemble the campaign: audience segments, channel mix, messaging hierarchy, creative-to-channel mapping, and launch timeline.
2. Call \`marketic::optimize_budget\` to allocate the campaign budget across channels using historical performance and attribution data. If attribution data is available, call \`marketic::get_attribution\` first.
3. Call \`marketic::analyze_positioning\` again to validate that the campaign strengthens the user's positioning relative to the competitor.

Output a complete campaign plan:
- **Audience Segments**: Primary and secondary, with targeting criteria
- **Channel Mix**: Which channels, why, and expected reach
- **Budget Allocation**: Per-channel spend with rationale
- **Creative Mapping**: Which variants go to which channels
- **Timeline**: Launch sequence and key milestones
- **KPIs**: Success metrics and measurement plan`,
      tools: [
        'marketic::build_campaign',
        'marketic::optimize_budget',
        'marketic::get_attribution',
        'marketic::analyze_positioning',
      ],
      requiresApproval: false,
      timeoutMs: 180_000,
    },

    // ── Stage 4: Launch (Human Approval Required) ─────────────
    {
      id: 'launch',
      name: 'Launch Campaign',
      agentType: 'DEPLOYER',
      instructions: `You are performing Stage 4 (final) of a competitor counter-campaign pipeline.

The campaign plan from Stage 3 has been approved. Now launch the ads:

1. Call \`marketic::launch_campaign_ad\` for each channel in the approved campaign plan, using the allocated budget and selected creative variants.
2. Report the launch status for each channel: ad ID, platform, budget committed, and expected delivery dates.

⚠️  CRITICAL: This stage SPENDS REAL MONEY. Every \`launch_campaign_ad\` call requires human verification before execution. Do not proceed without explicit approval for each ad launch.

After launch, provide:
- **Launch Summary**: Ads launched, total budget committed, platforms
- **Monitoring Plan**: What to track in the first 72 hours
- **Optimization Triggers**: Conditions that should trigger budget reallocation`,
      tools: [
        'marketic::launch_campaign_ad',
        'marketic::get_attribution',
      ],
      requiresApproval: true,
      timeoutMs: 300_000,
    },
  ],
};

// ----------------------------------------------------------------
// Additional Pipeline Templates (for future use)
// ----------------------------------------------------------------

export const BRAND_AWARENESS_PIPELINE: Pipeline = {
  id: 'brand-awareness',
  name: 'Brand Awareness Campaign',
  description:
    'Position brand → Generate narrative → Build multi-channel awareness campaign → Launch',

  stages: [
    {
      id: 'position',
      name: 'Brand Positioning',
      agentType: 'RESEARCHER',
      instructions: `Analyze the user's current brand positioning. Call \`marketic::analyze_positioning\` to map the brand relative to competitors and identify the core value proposition. Identify the most compelling angle for a brand awareness push.`,
      tools: ['marketic::analyze_positioning', 'marketic::collect_signals'],
      requiresApproval: false,
      timeoutMs: 90_000,
    },
    {
      id: 'narrative',
      name: 'Narrative Development',
      agentType: 'RESEARCHER',
      instructions: `Develop a compelling brand narrative. Call \`marketic::generate_narrative\` with the positioning analysis. Then call \`marketic::generate_creatives\` to produce awareness-focused ad creatives that embody the narrative.`,
      tools: ['marketic::generate_narrative', 'marketic::generate_creatives', 'marketic::generate_social_posts'],
      requiresApproval: false,
      timeoutMs: 120_000,
    },
    {
      id: 'launch',
      name: 'Launch Awareness Campaign',
      agentType: 'DEPLOYER',
      instructions: `Build and launch the brand awareness campaign. Call \`marketic::build_campaign\` then \`marketic::optimize_budget\` for reach-optimized allocation. Finally call \`marketic::launch_campaign_ad\` for each channel. Human approval required for all ad launches.`,
      tools: ['marketic::build_campaign', 'marketic::optimize_budget', 'marketic::launch_campaign_ad'],
      requiresApproval: true,
      timeoutMs: 300_000,
    },
  ],
};

export const PERFORMANCE_OPTIMIZATION_PIPELINE: Pipeline = {
  id: 'performance-optimization',
  name: 'Campaign Performance Optimization',
  description:
    'Audit live campaigns → Diagnose underperformance → Reallocate budget → Relaunch',

  stages: [
    {
      id: 'audit',
      name: 'Performance Audit',
      agentType: 'RESEARCHER',
      instructions: `Retrieve and analyze performance data for all active campaigns. Call \`marketic::get_attribution\` to get channel-level ROI, CAC, and conversion data. Identify underperforming channels and top performers.`,
      tools: ['marketic::get_attribution', 'marketic::collect_signals'],
      requiresApproval: false,
      timeoutMs: 90_000,
    },
    {
      id: 'reallocate',
      name: 'Budget Reallocation',
      agentType: 'RESEARCHER',
      instructions: `Based on the performance audit, call \`marketic::optimize_budget\` to reallocate spend from underperforming channels to top performers. If new creatives are needed, call \`marketic::generate_creatives\` for the channels getting increased budget.`,
      tools: ['marketic::optimize_budget', 'marketic::generate_creatives'],
      requiresApproval: false,
      timeoutMs: 120_000,
    },
    {
      id: 'relaunch',
      name: 'Relaunch Optimized Campaign',
      agentType: 'DEPLOYER',
      instructions: `Launch the reallocated campaign with new creatives where applicable. Call \`marketic::launch_campaign_ad\` for each updated ad. Human approval required for all launches.`,
      tools: ['marketic::launch_campaign_ad', 'marketic::get_attribution'],
      requiresApproval: true,
      timeoutMs: 300_000,
    },
  ],
};

// ----------------------------------------------------------------
// Pipeline Registry (convenience export)
// ----------------------------------------------------------------

export const MARKETING_PIPELINES: Record<string, Pipeline> = {
  [COMPETITOR_COUNTER_CAMPAIGN_PIPELINE.id]: COMPETITOR_COUNTER_CAMPAIGN_PIPELINE,
  [BRAND_AWARENESS_PIPELINE.id]: BRAND_AWARENESS_PIPELINE,
  [PERFORMANCE_OPTIMIZATION_PIPELINE.id]: PERFORMANCE_OPTIMIZATION_PIPELINE,
};
