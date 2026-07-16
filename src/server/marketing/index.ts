// ============================================================
// Quay — Marketing Module Entry Point
// Barrel export + registration function.
//
// Usage in src/server/index.ts:
//   import { registerMarketingModule } from './marketing/index.js';
//   await registerMarketingModule(mcpRegistry);
// ============================================================

import type { MCPRegistry } from '../mcp/index.js';
import { PIPELINE_TEMPLATES } from '../pipeline/pipeline.js';

// ----------------------------------------------------------------
// Re-exports
// ----------------------------------------------------------------

export {
  MARKETIC_MCP_CONFIG,
  MARKETIC_TOOLS,
  MARKETING_QUERY_PRESETS,
  MARKETING_ENSEMBLE_PRESETS,
  MARKETING_AGENT,
  type MarketingAgentDefinition,
  type MarketingEnsembleMode,
} from './config.js';

export {
  COMPETITOR_COUNTER_CAMPAIGN_PIPELINE,
  BRAND_AWARENESS_PIPELINE,
  PERFORMANCE_OPTIMIZATION_PIPELINE,
  MARKETING_PIPELINES,
} from './pipeline.js';

// ----------------------------------------------------------------
// Module Registration
// ----------------------------------------------------------------

/**
 * Registers the marketing module with the Quay server:
 *
 * 1. Starts the marketic MCP server (Python process via stdio JSON-RPC).
 * 2. Merges marketing pipeline templates into the global PIPELINE_TEMPLATES.
 * 3. Merges marketing query presets into the global QUERY_PRESETS.
 *
 * Safe to call multiple times — registration is idempotent.
 */
export async function registerMarketingModule(
  mcpRegistry: MCPRegistry
): Promise<void> {
  // 1. Register the marketic MCP server
  const { MARKETIC_MCP_CONFIG, MARKETING_QUERY_PRESETS } = await import('./config.js');
  const { MARKETING_PIPELINES } = await import('./pipeline.js');

  // Dynamically import QUERY_PRESETS to merge presets without circular dependency
  const { QUERY_PRESETS } = await import('../../lib/routing.js');

  // Check if already registered
  const existing = mcpRegistry.getServer(MARKETIC_MCP_CONFIG.name);
  if (existing) {
    console.log('[Marketing] marketic MCP server already registered, skipping');
  } else {
    try {
      await mcpRegistry.register(MARKETIC_MCP_CONFIG);
      console.log('[Marketing] ✓ Marketic MCP server registered');
    } catch (err) {
      console.warn(
        '[Marketing] ✗ Failed to start marketic MCP server:',
        err instanceof Error ? err.message : String(err)
      );
      console.warn(
        '[Marketing]   Ensure python3 and the marketic package are installed:'
      );
      console.warn('[Marketing]   pip install marketic');
    }
  }

  // 2. Merge marketing pipeline templates into global registry
  for (const [id, pipeline] of Object.entries(MARKETING_PIPELINES)) {
    if (!PIPELINE_TEMPLATES[id]) {
      PIPELINE_TEMPLATES[id] = pipeline;
    }
  }
  console.log(
    `[Marketing] ✓ Registered ${Object.keys(MARKETING_PIPELINES).length} pipeline templates`
  );

  // 3. Merge marketing query presets into global routing
  for (const [id, preset] of Object.entries(MARKETING_QUERY_PRESETS)) {
    if (!QUERY_PRESETS[id]) {
      QUERY_PRESETS[id] = preset;
    }
  }
  console.log(
    `[Marketing] ✓ Registered ${Object.keys(MARKETING_QUERY_PRESETS).length} query presets`
  );
}
