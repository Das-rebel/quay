#!/usr/bin/env bun
// ============================================================
// Quay — Seed Script
// Creates demo data in SQLite for first run
// ============================================================

import { dbq } from '../src/server/db/index.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('[Seed] Starting...');

  // Check if already seeded
  const existing = dbq.select<{ id: string }>('projects');
  if (existing.length > 0) {
    console.log('[Seed] Already seeded, skipping.');
    return;
  }

  const projectId = uuidv4();
  const now = Date.now();

  // Create demo project
  dbq.insert('projects', {
    id: projectId,
    name: 'Demo E-Commerce Platform',
    repo_url: 'https://github.com/example/ecommerce',
    description: 'Full-stack e-commerce platform with payments, auth, and inventory',
    created_at: now,
  });
  console.log('[Seed] ✓ Created project');

  // Create agents
  const agentData = [
    { name: 'Alice Coder', type: 'CODER', provider: 'anthropic', model: 'claude-sonnet-4-20250514', status: 'IDLE' },
    { name: 'Bob Reviewer', type: 'REVIEWER', provider: 'openai', model: 'gpt-4o', status: 'IDLE' },
    { name: 'Carol Security', type: 'SECURITY', provider: 'anthropic', model: 'claude-3-5-sonnet-latest', status: 'IDLE' },
    { name: 'Dave Architect', type: 'ARCHITECT', provider: 'anthropic', model: 'claude-3-5-sonnet-latest', status: 'IDLE' },
    { name: 'Eve Deployer', type: 'DEPLOYER', provider: 'groq', model: 'llama-3.3-70b-versatile', status: 'OFFLINE' },
  ];

  const agentIds: string[] = [];
  for (const a of agentData) {
    const id = uuidv4();
    agentIds.push(id);
    dbq.insert('agents', {
      id, name: a.name, type: a.type, provider: a.provider, model: a.model,
      status: a.status, capacity: 2, pool_size: 1, config: '{}', created_at: now,
    });
  }
  console.log('[Seed] ✓ Created 5 agents');

  // Create demo tasks
  const taskData = [
    { title: 'Add OAuth2 GitHub login', description: 'Implement GitHub OAuth2 flow with refresh tokens', state: 'IN_PROGRESS', priority: 9, agentId: agentIds[0] },
    { title: 'Fix Stripe webhook idempotency', description: 'Duplicate webhook events causing double-charge', state: 'REVIEW', priority: 9, agentId: agentIds[1] },
    { title: 'Refactor user auth module', description: 'Split monolithic auth into services', state: 'QUEUED', priority: 6, agentId: null },
    { title: 'Add Redis query caching', description: 'Cache hot paths: product listings, cart', state: 'BACKLOG', priority: 7, agentId: null },
    { title: 'Postgres index optimization', description: 'Slow query analysis and index additions', state: 'DONE', priority: 8, agentId: agentIds[0] },
    { title: 'API rate limiting per tenant', description: 'Token bucket rate limiting per API key', state: 'BLOCKED', priority: 8, agentId: null },
    { title: 'Dark mode CSS variables', description: 'Theme system with CSS custom properties', state: 'BACKLOG', priority: 4, agentId: null },
    { title: 'Migrate to Postgres 16', description: 'Upgrade, benchmark, rollback plan', state: 'QUEUED', priority: 5, agentId: null },
  ];

  for (const t of taskData) {
    const id = uuidv4();
    const createdAt = Date.now() - Math.floor(Math.random() * 7 * 86400000);
    const updatedAt = Date.now() - Math.floor(Math.random() * 86400000);
    dbq.insert('tasks', {
      id, project_id: projectId, title: t.title, description: t.description,
      state: t.state, priority: t.priority, scheduling_policy: 'FAIR_SHARE',
      assigned_agent_id: t.agentId, correlation_id: null, parent_task_id: null,
      created_at: createdAt, updated_at: updatedAt,
      completed_at: t.state === 'DONE' ? Date.now() : null,
    });
  }
  console.log('[Seed] ✓ Created 8 tasks');

  console.log('[Seed] ✓ Done! Demo data ready.');
  console.log('[Seed] Run: bun run src/server/index.ts');
  process.exit(0);
}

seed().catch((e) => {
  console.error('[Seed] Error:', e);
  process.exit(1);
});
