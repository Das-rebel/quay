// ============================================================
// API: Marketing — Competitor Analysis
// ============================================================

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mcpRegistry } from '../../../../server/mcp/index.js';

// POST /api/marketing/analyze
// Body: { brand: string, days?: number }
// Calls: marketic::analyze_competitor

export const POST: RequestHandler = async ({ request }) => {
  let body: { brand?: string; days?: number };

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { brand, days } = body;

  if (!brand || typeof brand !== 'string') {
    return json({ error: 'Field "brand" (string) is required' }, { status: 400 });
  }

  const args: Record<string, unknown> = { brand };
  if (typeof days === 'number' && days > 0) {
    args.days = days;
  }

  try {
    const result = await mcpRegistry.routeTool('marketic::analyze_competitor', args);

    if (!result.success) {
      return json(
        { error: result.error ?? 'Competitor analysis failed', tool: result.tool },
        { status: 502 }
      );
    }

    return json(result.result);
  } catch (err) {
    return json(
      { error: 'Failed to call marketic::analyze_competitor', detail: String(err) },
      { status: 500 }
    );
  }
};
