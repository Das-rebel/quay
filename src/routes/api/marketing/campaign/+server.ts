// ============================================================
// API: Marketing — Campaign Build & Launch
// ============================================================

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mcpRegistry } from '../../../../server/mcp/index.js';

// POST /api/marketing/campaign
// Body: { action: "build" | "launch", ...params }
//   build  → marketic::build_campaign
//   launch → marketic::launch_campaign_ad

type CampaignAction = 'build' | 'launch';

const VALID_ACTIONS: CampaignAction[] = ['build', 'launch'];

export const POST: RequestHandler = async ({ request }) => {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action } = body as { action?: unknown };

  if (!action || typeof action !== 'string' || !VALID_ACTIONS.includes(action as CampaignAction)) {
    return json(
      { error: `Field "action" must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 }
    );
  }

  // Build the tool name from the action
  const toolName = action === 'build' ? 'build_campaign' : 'launch_campaign_ad';

  // Pass through remaining params (excluding action itself)
  const { action: _action, ...params } = body;

  try {
    const result = await mcpRegistry.routeTool(`marketic::${toolName}`, params);

    if (!result.success) {
      return json(
        { error: result.error ?? `Campaign ${action} failed`, tool: result.tool },
        { status: 502 }
      );
    }

    return json(result.result);
  } catch (err) {
    return json(
      { error: `Failed to call marketic::${toolName}`, detail: String(err) },
      { status: 500 }
    );
  }
};
