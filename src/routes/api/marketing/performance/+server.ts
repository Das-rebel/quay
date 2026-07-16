// ============================================================
// API: Marketing — Campaign Performance / Attribution
// ============================================================

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mcpRegistry } from '../../../../server/mcp/index.js';

// GET /api/marketing/performance?campaign_id=xxx
// Calls: marketic::get_attribution

export const GET: RequestHandler = async ({ url }) => {
  const campaignId = url.searchParams.get('campaign_id');

  if (!campaignId) {
    return json(
      { error: 'Query parameter "campaign_id" is required' },
      { status: 400 }
    );
  }

  try {
    const result = await mcpRegistry.routeTool('marketic::get_attribution', {
      campaign_id: campaignId,
    });

    if (!result.success) {
      return json(
        { error: result.error ?? 'Attribution lookup failed', tool: result.tool },
        { status: 502 }
      );
    }

    return json(result.result);
  } catch (err) {
    return json(
      { error: 'Failed to call marketic::get_attribution', detail: String(err) },
      { status: 500 }
    );
  }
};
