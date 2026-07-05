// ============================================================
// Quay — Svelte Stores for Dashboard State
// ============================================================

import { writable, derived } from 'svelte/store';
import type { Task, Agent, Run, DashboardStats, PipelineStage } from '../types/index.js';

// ── Core Stores ─────────────────────────────────────────────────
export const tasks = writable<Task[]>([]);
export const agents = writable<Agent[]>([]);
export const runs = writable<Run[]>([]);
export const stats = writable<DashboardStats | null>(null);
export const currentProjectId = writable<string | null>(null);
export const currentRunId = writable<string | null>(null);
export const sseConnected = writable(false);

// ── Mode: mock data vs live API ────────────────────────────────
export const dataMode = writable<'live' | 'mock'>('mock');

// ── Derived: Kanban columns ─────────────────────────────────────
export const kanbanColumns = derived(tasks, ($tasks) => {
  const states = ['BACKLOG', 'QUEUED', 'IN_PROGRESS', 'REVIEW', 'DONE', 'FAILED', 'BLOCKED'] as const;
  return states.map(state => ({
    state,
    label: state.replace(/_/g, ' '),
    tasks: $tasks.filter(t => t.state === state),
  }));
});

// ── API Helpers ─────────────────────────────────────────────────
const BASE = 'http://localhost:3001';
const API_KEY = 'quay-dev-key';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Actions ─────────────────────────────────────────────────────
export async function loadTasks(projectId: string) {
  const data = await apiFetch(`/api/projects/${projectId}/tasks`);
  tasks.set(data);
}

export async function loadAgents() {
  const data = await apiFetch('/api/agents');
  agents.set(data);
}

export async function loadStats(projectId?: string) {
  const path = projectId ? `/api/stats?projectId=${projectId}` : '/api/stats';
  const data = await apiFetch(path);
  stats.set(data);
}

export async function createTask(projectId: string, title: string, description = '', priority = 5) {
  const data = await apiFetch(`/api/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ title, description, priority }),
  });
  tasks.update(t => [data, ...t]);
  return data;
}

export async function transitionTask(taskId: string, event: string, userId?: string) {
  const result = await apiFetch(`/api/tasks/${taskId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ event, userId }),
  });
  tasks.update(ts => ts.map(t => t.id === taskId ? { ...t, state: result.to } : t));
  return result;
}

export async function runPipeline(taskId: string, pipelineId = 'full_feature') {
  return apiFetch(`/api/tasks/${taskId}/run`, {
    method: 'POST',
    body: JSON.stringify({ pipelineId }),
  });
}

// ── Mock Data (for mock mode) ───────────────────────────────────
const MOCK_TASKS: Task[] = [
  { id: 't1', projectId: 'p1', title: 'Add OAuth2 login', description: 'Implement GitHub OAuth', state: 'IN_PROGRESS', priority: 8, schedulingPolicy: 'STRICT_PRIORITY', assignedAgentId: 'a1', correlationId: null, parentTaskId: null, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 3600000, completedAt: null },
  { id: 't2', projectId: 'p1', title: 'Fix payment webhook retry', description: ' idempotency on Stripe webhook', state: 'REVIEW', priority: 9, schedulingPolicy: 'STRICT_PRIORITY', assignedAgentId: 'a2', correlationId: null, parentTaskId: null, createdAt: Date.now() - 172800000, updatedAt: Date.now() - 7200000, completedAt: null },
  { id: 't3', projectId: 'p1', title: 'Refactor user auth module', description: 'Split into smaller services', state: 'QUEUED', priority: 6, schedulingPolicy: 'FAIR_SHARE', assignedAgentId: null, correlationId: null, parentTaskId: null, createdAt: Date.now() - 259200000, updatedAt: Date.now() - 86400000, completedAt: null },
  { id: 't4', projectId: 'p1', title: 'Add Redis caching layer', description: 'Cache hot query results', state: 'BACKLOG', priority: 5, schedulingPolicy: 'FAIR_SHARE', assignedAgentId: null, correlationId: null, parentTaskId: null, createdAt: Date.now() - 345600000, updatedAt: Date.now() - 172800000, completedAt: null },
  { id: 't5', projectId: 'p1', title: 'Database index optimization', description: 'Add indexes for slow queries', state: 'DONE', priority: 7, schedulingPolicy: 'SHORTEST_JOB_FIRST', assignedAgentId: 'a1', correlationId: null, parentTaskId: null, createdAt: Date.now() - 432000000, updatedAt: Date.now() - 259200000, completedAt: Date.now() - 259200000 },
  { id: 't6', projectId: 'p1', title: 'Update API rate limiting', description: 'Per-tenant rate limits', state: 'BLOCKED', priority: 8, schedulingPolicy: 'STRICT_PRIORITY', assignedAgentId: null, correlationId: null, parentTaskId: null, createdAt: Date.now() - 518400000, updatedAt: Date.now() - 432000000, completedAt: null },
  { id: 't7', projectId: 'p1', title: 'Migrate to Postgres 16', description: 'Upgrade and benchmark', state: 'BACKLOG', priority: 4, schedulingPolicy: 'FAIR_SHARE', assignedAgentId: null, correlationId: null, parentTaskId: null, createdAt: Date.now() - 604800000, updatedAt: Date.now() - 518400000, completedAt: null },
  { id: 't8', projectId: 'p1', title: 'Add Dark mode support', description: 'CSS variables + theme toggle', state: 'QUEUED', priority: 3, schedulingPolicy: 'FAIR_SHARE', assignedAgentId: null, correlationId: null, parentTaskId: null, createdAt: Date.now() - 691200000, updatedAt: Date.now() - 604800000, completedAt: null },
];

const MOCK_STATS: DashboardStats = {
  totalTasks: 8,
  tasksByState: { BACKLOG: 2, QUEUED: 2, IN_PROGRESS: 1, REVIEW: 1, DONE: 1, FAILED: 0, BLOCKED: 1 },
  activeAgents: 3,
  totalAgents: 5,
  totalRunsToday: 12,
  totalCostToday: 0.0847,
  avgLatencyMs: 1240,
  uptimeSeconds: 86400,
};

export function loadMockData() {
  tasks.set(MOCK_TASKS);
  stats.set(MOCK_STATS);
  agents.set([
    { id: 'a1', name: 'Alice Coder', type: 'CODER', provider: 'anthropic', model: 'claude-sonnet-4-20250514', status: 'BUSY', capacity: 2, poolSize: 1, config: {}, createdAt: Date.now() - 2592000000 },
    { id: 'a2', name: 'Bob Reviewer', type: 'REVIEWER', provider: 'openai', model: 'gpt-4o', status: 'IDLE', capacity: 3, poolSize: 1, config: {}, createdAt: Date.now() - 2592000000 },
    { id: 'a3', name: 'Carol Security', type: 'SECURITY', provider: 'anthropic', model: 'claude-3-5-sonnet-latest', status: 'IDLE', capacity: 2, poolSize: 1, config: {}, createdAt: Date.now() - 2592000000 },
    { id: 'a4', name: 'Dave Architect', type: 'ARCHITECT', provider: 'anthropic', model: 'claude-3-5-sonnet-latest', status: 'IDLE', capacity: 1, poolSize: 1, config: {}, createdAt: Date.now() - 2592000000 },
    { id: 'a5', name: 'Eve Deployer', type: 'DEPLOYER', provider: 'groq', model: 'llama-3.3-70b-versatile', status: 'OFFLINE', capacity: 2, poolSize: 1, config: {}, createdAt: Date.now() - 2592000000 },
  ]);
}
