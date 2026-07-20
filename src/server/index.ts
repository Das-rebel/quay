// ============================================================
// Quay — Main Server Entry Point
// Hono + Bun runtime + bun:sqlite
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { dbq } from './db/index.js';
import { mcpRegistry } from './mcp/index.js';
import { sseBroadcaster } from './sse/index.js';
import { pipelineExecutor, PIPELINE_TEMPLATES } from './pipeline/pipeline.js';
import { memoryTree } from './memory/memoryTree.js';
import { MARKETIC_MCP_CONFIG } from './marketing/config.js';
import type { Task, Agent, Run, TaskState, TaskEvent } from '../lib/types/index.js';
import { v4 as uuidv4 } from 'uuid';

const app = new Hono();

// ── CORS — restrict origins in production ─────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'];
app.use('*', cors({
  origin: (origin: string) => {
    if (ALLOWED_ORIGINS[0] === '*' || !origin) return '*';
    return ALLOWED_ORIGINS.includes(origin) ? origin : '';
  },
  allowHeaders: ['*'],
  allowMethods: ['*'],
}));

// ── Zod Schemas for Input Validation ──────────────────────────
const CreateProjectSchema = z.object({
  name: z.string().min(1, 'name is required'),
  repoUrl: z.string().url().optional(),
  description: z.string().optional(),
});

const CreateAgentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  capacity: z.number().int().min(1).optional(),
  poolSize: z.number().int().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const UpdateAgentStatusSchema = z.object({
  status: z.string().min(1),
});

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(999).optional(),
  schedulingPolicy: z.enum(['FAIR_SHARE', 'STRICT_PRIORITY', 'SHORTEST_JOB_FIRST']).optional(),
});

const TaskTransitionSchema = z.object({
  event: z.enum(['SUBMIT', 'ASSIGN', 'STEP_COMPLETE', 'APPROVE', 'REJECT', 'RETRY', 'UNBLOCK', 'TIMEOUT']),
  userId: z.string().optional(),
  agentId: z.string().uuid().optional(),
});

const RunPipelineSchema = z.object({
  pipelineId: z.string().min(1),
});

const TestEventSchema = z.object({
  type: z.enum(['task:created', 'task:state_change', 'run:started', 'run:progress', 'run:completed', 'run:failed', 'agent:status', 'sandbox:status', 'sse:heartbeat']),
  data: z.record(z.string(), z.unknown()),
});

function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { success: false, error: issues };
  }
  return { success: true, data: result.data };
}
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`[${c.req.method} ${c.req.path}] ${c.res.status ?? 0} ${ms}ms`);
});

// ── Auth ──────────────────────────────────────────────────────
const API_KEY = process.env.QUAY_API_KEY ?? 'quay-dev-key';
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/health' || c.req.path.startsWith('/sse')) return next();
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  if (auth.slice(7) !== API_KEY) return c.json({ error: 'Invalid API key' }, 403);
  await next();
});

// ── Health ─────────────────────────────────────────────────────
app.get('/health', (c) => c.json({
  status: 'ok',
  uptime: process.uptime(),
  mcpServers: mcpRegistry.getAllServers().length,
  sseClients: sseBroadcaster.clientCount,
  version: '0.1.0',
}));

// ── SSE Stream ─────────────────────────────────────────────────
app.get('/sse', (c) => {
  const clientId = c.req.query('clientId') ?? uuidv4();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`));
        } catch { clearInterval(heartbeat); }
      }, 30000);

      const disconnect = sseBroadcaster.addClient(clientId, controller);
      c.req.raw.signal?.addEventListener('abort', () => { clearInterval(heartbeat); disconnect(); });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════════════

// ── Projects ────────────────────────────────────────────────────
app.post('/api/projects', async (c) => {
  const parsed = validate(CreateProjectSchema, await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const { name, repoUrl, description } = parsed.data;
  const id = uuidv4();
  dbq.insert('projects', { id, name, repo_url: repoUrl ?? null, description: description ?? null, created_at: Date.now() });
  return c.json({ id });
});

app.get('/api/projects', async (c) => {
  const all = dbq.select<{ id: string; name: string; repo_url: string; description: string; created_at: number }>('projects', undefined, 'created_at DESC');
  return c.json(all);
});

app.get('/api/projects/:id', async (c) => {
  const [project] = dbq.select<{ id: string; name: string; repo_url: string; description: string; created_at: number }>('projects', { id: c.req.param('id') });
  if (!project) return c.json({ error: 'Not found' }, 404);
  return c.json(project);
});

// ── Agents ─────────────────────────────────────────────────────
app.get('/api/agents', async (c) => {
  const all = dbq.select<{ id: string; name: string; type: string; provider: string; model: string; status: string; capacity: number; pool_size: number; config: string; created_at: number }>('agents');
  return c.json(all);
});

app.post('/api/agents', async (c) => {
  const parsed = validate(CreateAgentSchema, await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const { name, type, provider, model, capacity, poolSize, config } = parsed.data;
  const id = uuidv4();
  dbq.insert('agents', {
    id, name, type, provider, model,
    status: 'IDLE', capacity: capacity ?? 1, pool_size: poolSize ?? 1,
    config: JSON.stringify(config ?? {}), created_at: Date.now(),
  });
  return c.json({ id });
});

app.patch('/api/agents/:id/status', async (c) => {
  const parsed = validate(UpdateAgentStatusSchema, await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  dbq.update('agents', { status: parsed.data.status }, { id: c.req.param('id') });
  return c.json({ ok: true });
});

// ── Tasks ──────────────────────────────────────────────────────
app.post('/api/projects/:projectId/tasks', async (c) => {
  const parsed = validate(CreateTaskSchema, await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const { title, description, priority, schedulingPolicy } = parsed.data;
  const projectId = c.req.param('projectId');
  const id = uuidv4();
  const now = Date.now();
  dbq.insert('tasks', {
    id, project_id: projectId, title,
    description: description ?? '',
    state: 'BACKLOG', priority: priority ?? 5,
    scheduling_policy: schedulingPolicy ?? 'FAIR_SHARE',
    assigned_agent_id: null, correlation_id: null, parent_task_id: null,
    created_at: now, updated_at: now, completed_at: null,
  });
  sseBroadcaster.broadcast('task:created', { taskId: id, projectId, title });
  return c.json({ id, state: 'BACKLOG' });
});

app.get('/api/projects/:projectId/tasks', async (c) => {
  const projectTasks = dbq.select<Record<string, unknown>>('tasks', { project_id: c.req.param('projectId') }, 'created_at DESC');
  return c.json(projectTasks);
});

app.get('/api/tasks/:id', async (c) => {
  const [task] = dbq.select<Record<string, unknown>>('tasks', { id: c.req.param('id') });
  if (!task) return c.json({ error: 'Not found' }, 404);
  return c.json(task);
});

// Kanban view
app.get('/api/projects/:projectId/kanban', async (c) => {
  const projectTasks = dbq.select<Record<string, unknown>>('tasks', { project_id: c.req.param('projectId') }, 'updated_at DESC');
  const states: TaskState[] = ['BACKLOG', 'QUEUED', 'IN_PROGRESS', 'REVIEW', 'DONE', 'FAILED', 'BLOCKED'];
  const columns = states.map(state => ({
    state,
    label: state.replace('_', ' '),
    tasks: projectTasks.filter(t => t.state === state),
  }));
  return c.json(columns);
});

// Task state transitions
app.post('/api/tasks/:id/transition', async (c) => {
  const parsed = validate(TaskTransitionSchema, await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const { event, userId, agentId } = parsed.data;
  const taskId = c.req.param('id');
  const [task] = dbq.select<{ id: string; state: string; project_id: string }>('tasks', { id: taskId });
  if (!task) return c.json({ error: 'Not found' }, 404);

  const transitions: Record<string, Record<string, string>> = {
    BACKLOG: { SUBMIT: 'QUEUED' },
    QUEUED: { ASSIGN: 'IN_PROGRESS' },
    IN_PROGRESS: { STEP_COMPLETE: 'REVIEW', TIMEOUT: 'FAILED' },
    REVIEW: { APPROVE: 'DONE', REJECT: 'IN_PROGRESS' },
    FAILED: { RETRY: 'QUEUED' },
    BLOCKED: { UNBLOCK: 'QUEUED' },
  };

  const nextState = transitions[task.state]?.[event];
  if (!nextState) return c.json({ error: `Invalid: ${task.state} + ${event}` }, 400);
  const fromState = task.state;
  const now = Date.now();

  dbq.update('tasks', {
    state: nextState,
    updated_at: now,
    ...(nextState === 'DONE' ? { completed_at: now } : {}),
    ...(event === 'ASSIGN' && agentId ? { assigned_agent_id: agentId } : {}),
  }, { id: taskId });

  dbq.insert('transitions', {
    id: uuidv4(), task_id: taskId,
    from_state: fromState, to_state: nextState,
    triggered_by: userId ?? null, event,
    payload: '{}', timestamp: now,
  });

  dbq.insert('audit_events', {
    id: uuidv4(), task_id: taskId,
    type: 'TASK_STATE_CHANGE',
    payload: JSON.stringify({ from: fromState, to: nextState, event }),
    actor_id: userId ?? null,
    timestamp: now,
  });

  sseBroadcaster.broadcast('task:state_change', { taskId, from: fromState, to: nextState, event });
  return c.json({ from: fromState, to: nextState });
});

// ── Pipeline Execution ──────────────────────────────────────────
app.post('/api/tasks/:taskId/run', async (c) => {
  const parsed = validate(RunPipelineSchema, await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error }, 400);
  const { pipelineId } = parsed.data;
  const taskId = c.req.param('taskId');
  const [task] = dbq.select<{ id: string; repo_url: string }>('tasks', { id: taskId });
  if (!task) return c.json({ error: 'Not found' }, 404);

  const pipeline = PIPELINE_TEMPLATES[pipelineId];
  if (!pipeline) return c.json({ error: `Unknown pipeline: ${pipelineId}` }, 400);

  // Return a runId immediately so client can poll /api/runs/:id
  const runId = uuidv4();
  pipelineExecutor.execute(taskId, pipeline, task.repo_url ?? null, runId).catch(console.error);
  return c.json({ message: 'Pipeline started', taskId, pipeline: pipeline.name, runId });
});

// ── Runs ───────────────────────────────────────────────────────
app.get('/api/tasks/:taskId/runs', async (c) => {
  const taskRuns = dbq.select<Record<string, unknown>>('runs', { task_id: c.req.param('taskId') }, 'started_at DESC');
  return c.json(taskRuns);
});

app.get('/api/runs/:id', async (c) => {
  const [run] = dbq.select<Record<string, unknown>>('runs', { id: c.req.param('id') });
  if (!run) return c.json({ error: 'Not found' }, 404);
  const steps = dbq.select<Record<string, unknown>>('step_attempts', { run_id: run.id }, 'step_index ASC');
  return c.json({ ...run, steps });
});

// ── Dashboard Stats ─────────────────────────────────────────────
app.get('/api/stats', async (c) => {
  const projectId = c.req.query('projectId');
  const allTasks = projectId
    ? dbq.select<Record<string, unknown>>('tasks', { project_id: projectId })
    : dbq.select<Record<string, unknown>>('tasks');
  const allAgents = dbq.select<{ status: string }>('agents');
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const tasksByState: Record<string, number> = {};
  for (const t of allTasks as Array<{ state: string }>) {
    tasksByState[t.state] = (tasksByState[t.state] ?? 0) + 1;
  }

  return c.json({
    totalTasks: allTasks.length,
    tasksByState,
    activeAgents: (allAgents as Array<{ status: string }>).filter(a => a.status === 'IDLE').length,
    totalAgents: allAgents.length,
    totalRunsToday: 0,
    totalCostToday: 0,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// ── Memory ─────────────────────────────────────────────────────
app.get('/api/projects/:projectId/lessons', async (c) => {
  const lessons = await memoryTree.getLessons(c.req.param('projectId'));
  return c.json(lessons);
});

// ── MCP Tools ──────────────────────────────────────────────────
app.get('/api/mcp/tools', async (c) => {
  const tools = await mcpRegistry.getAllTools();
  return c.json(tools);
});

// ── Marketing Intelligence Routes ──────────────────────────────

// POST /api/marketing/analyze
app.post('/api/marketing/analyze', async (c) => {
  const { brand, days } = await c.req.json().catch(() => ({}));
  if (!brand || typeof brand !== 'string') {
    return c.json({ error: 'Field "brand" (string) is required' }, 400);
  }
  const args: Record<string, unknown> = { brand };
  if (typeof days === 'number' && days > 0) args.days = days;
  try {
    const result = await mcpRegistry.routeTool('marketic::analyze_competitor', args);
    if (!result.success) return c.json({ error: result.error ?? 'Analysis failed', tool: result.tool }, 502);
    return c.json(result.result);
  } catch (err) {
    return c.json({ error: 'Failed to call marketic::analyze_competitor', detail: String(err) }, 500);
  }
});

// POST /api/marketing/creatives
app.post('/api/marketing/creatives', async (c) => {
  const { competitor, count } = await c.req.json().catch(() => ({}));
  if (!competitor || typeof competitor !== 'string') {
    return c.json({ error: 'Field "competitor" (string) is required' }, 400);
  }
  try {
    const result = await mcpRegistry.routeTool('marketic::generate_creatives', {
      product_name: competitor,
      product_description: competitor,
      num_variants: typeof count === 'number' ? count : 3,
    });
    if (!result.success) return c.json({ error: result.error ?? 'Creative generation failed', tool: result.tool }, 502);
    return c.json(result.result);
  } catch (err) {
    return c.json({ error: 'Failed to call marketic::generate_creatives', detail: String(err) }, 500);
  }
});

// POST /api/marketing/campaign
app.post('/api/marketing/campaign', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { action } = body;
  if (!action || !['build', 'launch'].includes(action)) {
    return c.json({ error: 'Field "action" must be "build" or "launch"' }, 400);
  }
  const toolName = action === 'build' ? 'marketic::build_campaign' : 'marketic::launch_campaign_ad';
  const { campaign_name, objective, channels, duration_weeks, total_budget } = body;
  try {
    const args: Record<string, unknown> = {};
    if (campaign_name) args.campaign_name = campaign_name;
    if (objective) args.objective = objective;
    if (channels) args.channels = channels;
    if (duration_weeks) args.duration_weeks = duration_weeks;
    if (total_budget) args.total_budget = total_budget;
    const result = await mcpRegistry.routeTool(toolName, args);
    if (!result.success) return c.json({ error: result.error ?? `Campaign ${action} failed`, tool: result.tool }, 502);
    return c.json(result.result);
  } catch (err) {
    return c.json({ error: `Failed to call ${toolName}`, detail: String(err) }, 500);
  }
});

// POST /api/marketing/signals
app.post('/api/marketing/signals', async (c) => {
  const { competitor, days } = await c.req.json().catch(() => ({}));
  try {
    const result = await mcpRegistry.routeTool('marketic::collect_signals', {
      brand: competitor ?? 'Quay',
      days: typeof days === 'number' ? days : 7,
    });
    if (!result.success) return c.json({ error: result.error ?? 'Signal collection failed', tool: result.tool }, 502);
    return c.json(result.result);
  } catch (err) {
    return c.json({ error: 'Failed to call marketic::collect_signals', detail: String(err) }, 500);
  }
});

// POST /api/marketing/performance
app.post('/api/marketing/performance', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { channel_points, model } = body;
  try {
    const result = await mcpRegistry.routeTool('marketic::get_attribution', {
      channel_points: channel_points ?? [],
      model: model ?? 'linear',
    });
    if (!result.success) return c.json({ error: result.error ?? 'Attribution analysis failed', tool: result.tool }, 502);
    return c.json(result.result);
  } catch (err) {
    return c.json({ error: 'Failed to call marketic::get_attribution', detail: String(err) }, 500);
  }
});

// ── SSE Test ───────────────────────────────────────────────────
// Protected: only allowed in dev mode or with valid API key
app.post('/api/test-event', async (c) => {
  if (API_KEY === 'quay-dev-key') {
    const parsed = validate(TestEventSchema, await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error }, 400);
    const { type, data } = parsed.data;
    sseBroadcaster.broadcast(type, data);
    return c.json({ ok: true, clients: sseBroadcaster.clientCount });
  }
  return c.json({ error: 'Disabled in production' }, 403);
});

// ── 404 ─────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ═══════════════════════════════════════════════════════════════
// Start
// ═══════════════════════════════════════════════════════════════

async function start() {
  const PORT = parseInt(process.env.QUAY_PORT ?? '3001');

  // Register Marketic MCP server for marketing intelligence
  console.log('[Quay] MCP: registering Marketic marketing intelligence...');
  try {
    await mcpRegistry.register(MARKETIC_MCP_CONFIG);
  } catch (e) {
    console.warn('[Quay] MCP: Marketic failed to start (marketing tools unavailable):', e);
  }

  console.log(`[Quay] MCP servers: ${mcpRegistry.getAllServers().length} running`);

  Bun.serve({ port: PORT, fetch: app.fetch });

  console.log(`[Quay] ✓ Listening on http://localhost:${PORT}`);
  console.log(`[Quay] Health: http://localhost:${PORT}/health`);
  console.log(`[Quay] API key: ${API_KEY === 'quay-dev-key' ? '(dev mode)' : '(custom)'}`);
  console.log(`[Quay] Dashboard: http://localhost:${PORT}/`);
}

start().catch(console.error);
