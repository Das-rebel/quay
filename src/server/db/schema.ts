// ============================================================
// Quay — Drizzle SQLite Schema
// ============================================================

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  repoUrl: text('repo_url'),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // AgentType
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  status: text('status').notNull().default('OFFLINE'),
  capacity: integer('capacity').notNull().default(1),
  poolSize: integer('pool_size').notNull().default(1),
  config: text('config').notNull().default('{}'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  state: text('state').notNull().default('BACKLOG'),
  priority: integer('priority').notNull().default(5),
  schedulingPolicy: text('scheduling_policy').notNull().default('FAIR_SHARE'),
  assignedAgentId: text('assigned_agent_id').references(() => agents.id),
  correlationId: text('correlation_id'),
  parentTaskId: text('parent_task_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  state: text('state').notNull().default('PENDING'),
  correlationId: text('correlation_id'),
  sandboxId: text('sandbox_id'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  error: text('error'),
  cost: real('cost').notNull().default(0),
  tokensIn: integer('tokens_in').notNull().default(0),
  tokensOut: integer('tokens_out').notNull().default(0),
});

export const stepAttempts = sqliteTable('step_attempts', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => runs.id),
  stepIndex: integer('step_index').notNull(),
  thought: text('thought'),
  action: text('action'),
  actionArgs: text('action_args').default('{}'), // JSON
  observation: text('observation'),
  error: text('error'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const sandboxes = sqliteTable('sandboxes', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => runs.id),
  type: text('type').notNull(), // SandboxType
  status: text('status').notNull().default('PENDING'),
  endpoint: text('endpoint'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  runId: text('run_id').references(() => runs.id),
  taskId: text('task_id').references(() => tasks.id),
  agentId: text('agent_id').references(() => agents.id),
  type: text('type').notNull(),
  payload: text('payload').notNull().default('{}'), // JSON
  actorId: text('actor_id'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

export const transitions = sqliteTable('transitions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  fromState: text('from_state').notNull(),
  toState: text('to_state').notNull(),
  triggeredBy: text('triggered_by'),
  event: text('event').notNull(),
  payload: text('payload').notNull().default('{}'), // JSON
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

// Scheduler decision log (why did task X get agent Y at time Z)
export const schedulerDecisions = sqliteTable('scheduler_decisions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  schedulingPolicy: text('scheduling_policy').notNull(),
  priority: integer('priority').notNull(),
  queuePosition: integer('queue_position').notNull(),
  reason: text('reason').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});
