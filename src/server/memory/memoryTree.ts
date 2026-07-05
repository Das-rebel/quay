// ============================================================
// Quay — Agent Memory System
// VOTED #3 — Hermes Memory (multi-level: short/medium/long)
// Built on A3M MemoryTree concepts + knowledge graph patterns
// ============================================================

import { dbq } from '../db/index.js';
import { eq, desc, and, gt } from 'drizzle-orm';
import type { Run, Task } from '../../lib/types/index.js';

// ----------------------------------------------------------------
// Memory Levels
// ----------------------------------------------------------------

interface ShortTermMemory {
  runId: string;
  steps: Array<{ thought: string; action: string; observation: string; ts: number }>;
}

interface MediumTermMemory {
  taskId: string;
  projectId: string;
  lessons: Array<{ pattern: string; resolution: string; ts: number }>;
  successRate: number;
  avgDurationMs: number;
}

interface LongTermMemory {
  agentId: string;
  capabilities: string[];   // what this agent does well
  failurePatterns: string[]; // what it fails on
  totalRuns: number;
  totalSuccesses: number;
  lastRunAt: number;
  successRate: number;
}

// ----------------------------------------------------------------
// Knowledge Graph Node (for agent-to-agent handoff knowledge)
// ----------------------------------------------------------------

interface KGNode {
  id: string;
  type: 'agent' | 'task_type' | 'tool' | 'pattern';
  label: string;
  properties: Record<string, unknown>;
  lastUpdated: number;
}

interface KGEdge {
  from: string;
  to: string;
  relation: 'succeeded_with' | 'failed_with' | 'used_by' | 'depends_on';
  weight: number; // confidence 0-1
  lastUpdated: number;
}

// ----------------------------------------------------------------
// Memory Tree
// ----------------------------------------------------------------

export class QuayMemoryTree {
  // In-memory caches (backed by SQLite via Drizzle)
  private shortTerm = new Map<string, ShortTermMemory>();
  private mediumTerm = new Map<string, MediumTermMemory>();
  private longTerm = new Map<string, LongTermMemory>();
  private kgNodes = new Map<string, KGNode>();
  private kgEdges: KGEdge[] = [];

  private readonly SHORT_TTL_MS = 30 * 60 * 1000;   // 30 min
  private readonly MEDIUM_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ── Short-term memory ──────────────────────────────────────────

  pushStep(runId: string, thought: string, action: string, observation: string) {
    const existing = this.shortTerm.get(runId) ?? { runId, steps: [] };
    existing.steps.push({ thought, action, observation, ts: Date.now() });
    this.shortTerm.set(runId, existing);
  }

  getShortTerm(runId: string): ShortTermMemory | undefined {
    return this.shortTerm.get(runId);
  }

  flushShortTerm(runId: string) {
    this.shortTerm.delete(runId);
  }

  // ── Medium-term memory ────────────────────────────────────────

  async recordLesson(taskId: string, projectId: string, pattern: string, resolution: string) {
    const key = `${projectId}::${taskId}`;
    const existing = this.mediumTerm.get(key) ?? {
      taskId,
      projectId,
      lessons: [],
      successRate: 0,
      avgDurationMs: 0,
    };
    existing.lessons.push({ pattern, resolution, ts: Date.now() });
    existing.lessons = existing.lessons.slice(-50); // keep last 50
    this.mediumTerm.set(key, existing);

    // Persist to audit_events for recovery
    dbq.insert('audit_events', {
      id: crypto.randomUUID(), task_id: taskId, run_id: null, agent_id: null,
      type: 'TOOL_CALL', payload: JSON.stringify({ type: 'lesson', pattern, resolution }),
      actor_id: null, timestamp: Date.now(),
    });
  }

  async getLessons(projectId: string): Promise<Array<{ pattern: string; resolution: string; ts: number }>> {
    const keyPrefix = `${projectId}::`;
    const results: Array<{ pattern: string; resolution: string; ts: number }> = [];
    for (const [key, mem] of this.mediumTerm) {
      if (key.startsWith(keyPrefix)) {
        results.push(...mem.lessons.slice(-10));
      }
    }
    return results.sort((a, b) => b.ts - a.ts).slice(0, 20);
  }

  // ── Long-term memory ──────────────────────────────────────────

  async updateAgentLongTerm(agentId: string, run: { error?: string; id?: string }, success: boolean) {
    const existing: LongTermMemory = this.longTerm.get(agentId) ?? {
      agentId,
      capabilities: [],
      failurePatterns: [],
      totalRuns: 0,
      totalSuccesses: 0,
      lastRunAt: 0,
      successRate: 0,
    };

    existing.totalRuns++;
    if (success) existing.totalSuccesses++;
    existing.lastRunAt = Date.now();
    existing.successRate = existing.totalSuccesses / existing.totalRuns;

    // Update capabilities/failures based on run data
    if (run.error) {
      const pattern = run.error.slice(0, 100);
      if (!existing.failurePatterns.includes(pattern)) {
        existing.failurePatterns.push(pattern);
        existing.failurePatterns = existing.failurePatterns.slice(-20);
      }
    }

    this.longTerm.set(agentId, existing);
  }

  getAgentLongTerm(agentId: string): LongTermMemory | undefined {
    return this.longTerm.get(agentId);
  }

  getBestAgentForTask(taskType: string, agents: Array<{ id: string; type: string; status: string }>): string | null {
    const scored = agents
      .filter(a => a.status === 'IDLE')
      .map(a => {
        const lt = this.longTerm.get(a.id);
        if (!lt) return { id: a.id, score: 0.5 }; // unknown = neutral
        // Score: success rate weighted by recency
        const recencyWeight = Math.max(0.1, 1 - (Date.now() - (lt.lastRunAt ?? 0)) / (7 * 24 * 60 * 60 * 1000));
        return { id: a.id, score: lt.successRate * recencyWeight };
      })
      .sort((a, b) => b.score - a.score);

    return scored[0]?.id ?? null;
  }

  // ── Knowledge Graph ────────────────────────────────────────────

  addKGNode(node: KGNode) {
    this.kgNodes.set(node.id, { ...node, lastUpdated: Date.now() });
  }

  addKGEdge(edge: KGEdge) {
    // Update or insert
    const idx = this.kgEdges.findIndex(e => e.from === edge.from && e.to === edge.to);
    if (idx >= 0) {
      // Weighted average
      const existing = this.kgEdges[idx];
      this.kgEdges[idx] = {
        ...existing,
        weight: (existing.weight + edge.weight) / 2,
        lastUpdated: Date.now(),
      };
    } else {
      this.kgEdges.push({ ...edge, lastUpdated: Date.now() });
    }
  }

  // Find agents that succeeded with similar patterns
  findSimilarSuccesses(pattern: string, limit = 5): string[] {
    const relevant = this.kgEdges
      .filter(e => e.relation === 'succeeded_with' && pattern.includes(e.from))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);
    return relevant.map(e => e.to);
  }

  // ── Full context injection ─────────────────────────────────────

  async buildContext(agentId: string, task: Task, projectId: string): Promise<string> {
    const parts: string[] = [];

    // Agent's own track record
    const lt = this.longTerm.get(agentId);
    if (lt) {
      parts.push(`## Your Performance\n- Success rate: ${(lt.successRate * 100).toFixed(0)}% (${lt.totalSuccesses}/${lt.totalRuns} runs)\n- Failure patterns: ${lt.failurePatterns.slice(-3).join('; ') || 'none recent'}`);
    }

    // Project lessons
    const lessons = await this.getLessons(projectId);
    if (lessons.length > 0) {
      parts.push(`## Recent Project Lessons\n${lessons.slice(0, 5).map(l => `- ${l.pattern}: ${l.resolution}`).join('\n')}`);
    }

    // Short-term (current run history)
    const st = this.shortTerm.get(task.id);
    if (st && st.steps.length > 0) {
      parts.push(`## Current Task History\n${st.steps.slice(-3).map(s => `- Thought: ${s.thought.slice(0, 80)}... Action: ${s.action}`).join('\n')}`);
    }

    return parts.join('\n\n');
  }
}

export const memoryTree = new QuayMemoryTree();
