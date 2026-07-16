// ============================================================
// API: Marketing — Creative Generation
// ============================================================

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mcpRegistry } from '../../../../server/mcp/index.js';

// POST /api/marketing/creatives
// Body: { competitor: string, count?: number, gap_ids?: string[] }
// Calls: marketic::generate_creatives

export const POST: RequestHandler = async ({ request }) => {
  let body: { competitor?: string; count?: number; gap_ids?: string[] };

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { competitor, count, gap_ids } = body;

  if (!competitor || typeof competitor !== 'string') {
    return json({ error: 'Field "competitor" (string) is required' }, { status: 400 });
  }

  const args: Record<string, unknown> = { competitor };

  if (typeof count === 'number' && count > 0) {
    args.count = count;
  }

  if (Array.isArray(gap_ids) && gap_ids.length > 0) {
    args.gap_ids = gap_ids;
  }

  try {
    const result = await mcpRegistry.routeTool('marketic::generate_creatives', args);

    if (!result.success) {
      return json(
        { error: result.error ?? 'Creative generation failed', tool: result.tool },
        { status: 502 }
      );
    }

    return json(result.result);
  } catch (err) {
    return json(
      { error: 'Failed to call marketic::generate_creatives', detail: String(err) },
      { status: 500 }
    );
  }
};
