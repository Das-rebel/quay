// ============================================================
// Quay — Pipeline Orchestrator
// VOTED #2 — Claude Pipeline (core workflow engine)
// Role-based multi-stage pipeline: Architect → Coder → Reviewer → Security → Deploy
// Pattern from: MetaGPT (role-based) + Claude Code /agents pipeline
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { dbq } from '../db/index.js';
import { agentRunner } from '../agents/agentRunner.js';
import { sseBroadcaster } from '../sse/index.js';
import { memoryTree } from '../memory/memoryTree.js';
import type { Pipeline, Task } from '../../lib/types/index.js';

// ----------------------------------------------------------------
// Default Pipeline Templates
// ----------------------------------------------------------------

export const PIPELINE_TEMPLATES: Record<string, Pipeline> = {
  full_feature: {
    id: 'full_feature',
    name: 'Full Feature Pipeline',
    description: 'Complete feature lifecycle: spec → code → review → security → deploy',
    stages: [
      {
        id: 'spec',
        name: 'Requirements & Architecture',
        agentType: 'ARCHITECT',
        instructions: 'You are a senior software architect. Given a feature request, produce a detailed SPEC.md covering: (1) acceptance criteria, (2) API contracts, (3) data model changes, (4) edge cases, (5) test strategy. Output ONLY the SPEC.md content.',
        tools: ['read_file', 'glob', 'bash'],
        requiresApproval: true,
        timeoutMs: 120000,
      },
      {
        id: 'implement',
        name: 'Implementation',
        agentType: 'CODER',
        instructions: 'You are a senior software engineer. Based on the SPEC.md, implement the feature completely. Write clean, idiomatic code. Run tests after each file. If tests fail, fix them.',
        tools: ['read_file', 'write_file', 'glob', 'bash', 'search_code'],
        requiresApproval: false,
        timeoutMs: 600000,
      },
      {
        id: 'review',
        name: 'Code Review',
        agentType: 'REVIEWER',
        instructions: 'You are a senior code reviewer. Review the implementation against SPEC.md. Check for: correctness, edge cases, performance, security, test coverage. List specific issues found.',
        tools: ['read_file', 'glob', 'bash'],
        requiresApproval: true,
        timeoutMs: 180000,
      },
      {
        id: 'security',
        name: 'Security Audit',
        agentType: 'SECURITY',
        instructions: 'You are a security engineer. Perform a focused audit for: injection vulnerabilities, auth/authz issues, data exposure, dependency vulnerabilities. Run `npm audit` or equivalent.',
        tools: ['bash', 'glob'],
        requiresApproval: false,
        timeoutMs: 120000,
      },
      {
        id: 'deploy',
        name: 'Deploy',
        agentType: 'DEPLOYER',
        instructions: 'You are a DevOps engineer. Deploy the approved changes to staging. Run the full CI pipeline. Report deployment status.',
        tools: ['bash'],
        requiresApproval: true,
        timeoutMs: 300000,
      },
    ],
  },

  quick_fix: {
    id: 'quick_fix',
    name: 'Quick Fix Pipeline',
    description: 'Bug fix only: reproduce → fix → test',
    stages: [
      {
        id: 'reproduce',
        name: 'Reproduce',
        agentType: 'CODER',
        instructions: 'Reproduce the bug. Write a failing test that demonstrates the issue. Do not fix yet.',
        tools: ['read_file', 'bash'],
        requiresApproval: false,
        timeoutMs: 60000,
      },
      {
        id: 'fix',
        name: 'Fix',
        agentType: 'CODER',
        instructions: 'Fix the bug. Make the failing test pass. Run full test suite.',
        tools: ['read_file', 'write_file', 'bash'],
        requiresApproval: true,
        timeoutMs: 180000,
      },
    ],
  },
};

// ----------------------------------------------------------------
// Pipeline Executor
// ----------------------------------------------------------------

export interface PipelineRunResult {
  pipelineId: string;
  taskId: string;
  stagesCompleted: number;
  totalStages: number;
  success: boolean;
  totalCost: number;
  durationMs: number;
  errors: string[];
}

export class PipelineExecutor {
  /**
   * Execute a pipeline for a task.
   * Each stage gets its own Run + Agent assignment.
   */
  async execute(
    taskId: string,
    pipeline: Pipeline,
    projectRepoUrl: string | null,
    runId?: string
  ): Promise<PipelineRunResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalCost = 0;

    // Get task
    const [task] = dbq.select<Record<string, unknown>>('tasks', { id: taskId });
    if (!task) throw new Error(`Task not found: ${taskId}`);

    sseBroadcaster.broadcast('task:state_change', { taskId, from: task.state as string, to: 'IN_PROGRESS' });

    // Update task to IN_PROGRESS
    dbq.update('tasks', { state: 'IN_PROGRESS', updated_at: Date.now() }, { id: taskId });

    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i];
      console.log(`[Pipeline] Stage ${i + 1}/${pipeline.stages.length}: ${stage.name}`);

      const agent = this.findAgent(stage.agentType);
      if (!agent) { errors.push(`No agent for: ${stage.name}`); break; }

      if (stage.requiresApproval) {
        sseBroadcaster.broadcast('task:state_change', { taskId, stage: stage.id, message: `Awaiting ${stage.name}`, blocked: true });
      }

      const sandboxId = uuidv4();
      const runId = uuidv4();

      // Insert run first to satisfy FOREIGN KEY from sandboxes
      dbq.insert('runs', {
        id: runId, task_id: taskId, agent_id: agent.id, state: 'RUNNING',
        sandbox_id: sandboxId, started_at: Date.now(), cost: 0, tokens_in: 0, tokens_out: 0,
      });

      dbq.insert('sandboxes', { id: sandboxId, run_id: runId, type: 'DOCKER', status: 'READY', created_at: Date.now() });

      dbq.update('agents', { status: 'BUSY' }, { id: agent.id });

      dbq.insert('audit_events', {
        id: uuidv4(), task_id: taskId, run_id: runId, agent_id: agent.id,
        type: 'RUN_STARTED', payload: JSON.stringify({ stage: stage.id, pipeline: pipeline.id }),
        actor_id: null, timestamp: Date.now(),
      });

      sseBroadcaster.broadcast('run:started', { runId, taskId, stage: stage.id, agent: agent.name });

      const result = await agentRunner.run(
        { ...task, description: `[${stage.name}] ${task.description}` } as any,
        agent, runId, stage.instructions, stage.tools
      );

      totalCost += result.cost;
      dbq.update('agents', { status: 'IDLE' }, { id: agent.id });

      if (!result.success) {
        errors.push(`Stage ${stage.name}: ${result.error}`);
        await memoryTree.updateAgentLongTerm(agent.id, { id: runId, error: result.error }, false);
        await memoryTree.recordLesson(taskId, task.project_id as string, `Stage ${stage.name} failed`, result.error ?? '?');
        break;
      }

      await memoryTree.updateAgentLongTerm(agent.id, { id: runId }, true);
    }

    const durationMs = Date.now() - startTime;
    const success = errors.length === 0;
    const now = Date.now();
    dbq.update('tasks', { state: success ? 'DONE' : 'FAILED', updated_at: now, ...(success ? { completed_at: now } : {}) }, { id: taskId });
    sseBroadcaster.broadcast('task:state_change', { taskId, to: success ? 'DONE' : 'FAILED', cost: totalCost, durationMs });

    return { pipelineId: pipeline.id, taskId, stagesCompleted: success ? pipeline.stages.length : errors.length, totalStages: pipeline.stages.length, success, totalCost, durationMs, errors };
  }

  private findAgent(type: string): { id: string; name: string; type: string; status: string; provider: string; model: string; config: string } | null {
    const candidates = dbq.select<{ id: string; name: string; type: string; status: string; provider: string; model: string; config: string }>('agents', { type });
    if (candidates.length === 0) return null;
    const idle = candidates.filter(a => a.status === 'IDLE');
    if (idle.length === 0) return null;
    const scored = idle.map(a => {
      const lt = memoryTree.getAgentLongTerm(a.id);
      return { agent: a, score: lt?.successRate ?? 0.5 };
    }).sort((a, b) => b.score - a.score);
    return scored[0]?.agent ?? null;
  }
}

export const pipelineExecutor = new PipelineExecutor();
