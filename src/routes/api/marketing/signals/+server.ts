// ============================================================
// API: Marketing — Market Signal Collection
// ============================================================

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mcpRegistry } from '../../../../server/mcp/index.js';

// POST /api/marketing/signals
// Body: { sources: string[], query?: string }
// Calls: marketic::collect_signals

export const POST: RequestHandler = async ({ request }) => {
  let body: { sources?: string[]; query?: string };

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sources, query } = body;

  if (!Array.isArray(sources) || sources.length === 0) {
    return json(
      { error: 'Field "sources" (non-empty string[]) is required' },
      { status: 400 }
    );
  }

  const args: Record<string, unknown> = { sources };

  if (typeof query === 'string' && query.trim().length > 0) {
    args.query = query;
  }

  try {
    const result = await mcpRegistry.routeTool('marketic::collect_signals', args);

    if (!result.success) {
      return json(
        { error: result.error ?? 'Signal collection failed', tool: result.tool },
        { status: 502 }
      );
    }

    return json(result.result);
  } catch (err) {
    return json(
      { error: 'Failed to call marketic::collect_signals', detail: String(err) },
      { status: 500 }
    );
  }
};
