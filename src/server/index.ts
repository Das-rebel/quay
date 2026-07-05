// ============================================================
// Quay — Main Server Entry Point
// Hono + Bun runtime + bun:sqlite
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { dbq } from './db/index.js';
import { mcpRegistry } from './mcp/index.js';
import { sseBroadcaster } from './sse/index.js';
import { pipelineExecutor, PIPELINE_TEMPLATES } from './pipeline/pipeline.js';
import { memoryTree } from './memory/memoryTree.js';
import type { Task, Agent, Run, TaskState, TaskEvent } from '../lib/types/index.js';
import { v4 as uuidv4 } from 'uuid';

const app = new Hono();

// ── Middleware ────────────────────────────────────────────────
app.use('*', cors({ origin: '*', allowHeaders: ['*'], allowMethods: ['*'] }));
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
  const body = await c.req.json<{ name: string; repoUrl?: string; description?: string }>();
  const id = uuidv4();
  dbq.insert('projects', { id, name: body.name, repo_url: body.repoUrl ?? null, description: body.description ?? null, created_at: Date.now() });
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
  const body = await c.req.json<{ name: string; type: string; provider: string; model: string; capacity?: number; poolSize?: number; config?: Record<string, unknown> }>();
  const id = uuidv4();
  dbq.insert('agents', {
    id, name: body.name, type: body.type, provider: body.provider, model: body.model,
    status: 'IDLE', capacity: body.capacity ?? 1, pool_size: body.poolSize ?? 1,
    config: JSON.stringify(body.config ?? {}), created_at: Date.now(),
  });
  return c.json({ id });
});

app.patch('/api/agents/:id/status', async (c) => {
  const { status } = await c.req.json<{ status: string }>();
  dbq.update('agents', { status }, { id: c.req.param('id') });
  return c.json({ ok: true });
});

// ── Tasks ──────────────────────────────────────────────────────
app.post('/api/projects/:projectId/tasks', async (c) => {
  const body = await c.req.json<{ title: string; description?: string; priority?: number; schedulingPolicy?: string }>();
  const projectId = c.req.param('projectId');
  const id = uuidv4();
  const now = Date.now();
  dbq.insert('tasks', {
    id, project_id: projectId, title: body.title,
    description: body.description ?? '',
    state: 'BACKLOG', priority: body.priority ?? 5,
    scheduling_policy: body.schedulingPolicy ?? 'FAIR_SHARE',
    assigned_agent_id: null, correlation_id: null, parent_task_id: null,
    created_at: now, updated_at: now, completed_at: null,
  });
  sseBroadcaster.broadcast('task:created', { taskId: id, projectId, title: body.title });
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
  const { event, userId } = await c.req.json<{ event: TaskEvent; userId?: string }>();
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
  const { pipelineId } = await c.req.json<{ pipelineId: string }>();
  const taskId = c.req.param('taskId');
  const [task] = dbq.select<{ id: string; repo_url: string }>('tasks', { id: taskId });
  if (!task) return c.json({ error: 'Not found' }, 404);

  const pipeline = PIPELINE_TEMPLATES[pipelineId];
  if (!pipeline) return c.json({ error: `Unknown pipeline: ${pipelineId}` }, 400);

  pipelineExecutor.execute(taskId, pipeline, task.repo_url ?? null).catch(console.error);
  return c.json({ message: 'Pipeline started', taskId, pipeline: pipeline.name });
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
  const projectId = c.req.param('projectId');
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

// ── SSE Test ───────────────────────────────────────────────────
app.post('/api/test-event', async (c) => {
  const { type, data } = await c.req.json<{ type: string; data: Record<string, unknown> }>();
  sseBroadcaster.broadcast(type as any, data);
  return c.json({ ok: true, clients: sseBroadcaster.clientCount });
});

// ── 404 ─────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ═══════════════════════════════════════════════════════════════
// Start
// ═══════════════════════════════════════════════════════════════

async function start() {
  const PORT = parseInt(process.env.QUAY_PORT ?? '3001');

  // MCP servers start on-demand (lazy) — skip auto-start for MVP
  console.log('[Quay] MCP: lazy-loading on first tool call (configure in QUAY_MCP_SERVERS env)');

  Bun.serve({ port: PORT, fetch: app.fetch });

  console.log(`[Quay] ✓ Listening on http://localhost:${PORT}`);
  console.log(`[Quay] Health: http://localhost:${PORT}/health`);
  console.log(`[Quay] API key: ${API_KEY === 'quay-dev-key' ? '(dev mode)' : '(custom)'}`);
  console.log(`[Quay] MCP servers: ${mcpRegistry.getAllServers().length} running`);
  console.log(`[Quay] Dashboard: http://localhost:${PORT}/`);
}

start().catch(console.error);
