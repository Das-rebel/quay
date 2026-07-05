// ============================================================
// Quay — Agent Runner
// Implements the SWE-agent observe→plan→act loop
// VOTED #2 — Claude Pipeline (core workflow engine)
// VOTED #5 — Hermes Memory (multi-level memory integration)
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { dbq } from '../db/index.js';
import { sseBroadcaster } from '../sse/index.js';
import { mcpRegistry } from '../mcp/index.js';
import { memoryTree } from '../memory/memoryTree.js';
import type { MCPToolResult } from '../mcp/index.js';

// ----------------------------------------------------------------
// Agent LLM Interface (pluggable — uses A3M or direct provider)
// ----------------------------------------------------------------

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export interface LLMResponse {
  thought: string;
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
  isDone: boolean;
  finalAnswer?: string;
}

async function callLLM(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig,
  maxTokens = 4096
): Promise<LLMResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  };

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  };

  const base = config.baseURL ?? `https://api.${config.provider}.ai`;
  const url = `${base}/v1/chat/completions`;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content ?? '';

  // Parse tool calls from <tool_call> XML tags
  const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
  const toolRegex = /<tool_call>\s*<name>([\w:]+)<\/name>\s*<args>([\s\S]*?)<\/args>\s*<\/tool_call>/g;
  let match;
  while ((match = toolRegex.exec(content)) !== null) {
    try { toolCalls.push({ name: match[1], arguments: JSON.parse(match[2]) }); } catch { /* skip */ }
  }

  const isDone = content.includes('<done>') || toolCalls.length === 0;
  const thought = content.split('<tool_call>')[0].trim();

  return { thought, toolCalls, isDone, finalAnswer: isDone ? content : undefined };
}

// ----------------------------------------------------------------
// Sandbox Execution (Docker via HTTP)
// ----------------------------------------------------------------

async function execInSandbox(sandboxId: string, command: string) {
  const base = process.env.SANDBOX_URL ?? 'http://localhost:7000';
  const res = await fetch(`${base}/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sandboxId, command }),
  });
  if (!res.ok) throw new Error(`Sandbox ${res.status}`);
  return res.json() as Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

// ----------------------------------------------------------------
// Agent Runner
// ----------------------------------------------------------------

export class AgentRunner {
  private maxSteps = 50;

  async run(
    task: Record<string, unknown>,
    agent: { id: string; name: string; type: string; provider: string; model: string },
    runId: string,
    instructions: string,
    enabledTools: string[] = []
  ): Promise<{ success: boolean; error?: string; cost: number }> {
    const startTime = Date.now();
    let totalCost = 0;
    let stepIndex = 0;

    const memoryContext = await memoryTree.buildContext(agent.id, task as any, task.project_id as string);

    const systemPrompt = `You are ${agent.name}, a ${agent.type} agent.
${instructions}
${memoryContext ? `\n\n## Context from Memory\n${memoryContext}` : ''}

Output format for each step:
1. Your thought in <think>...</think>
2. Tool calls in <tool_call><name>tool</name><args>{"key":"value"}</args></tool_call>
3. When done: <done>your_answer</done>`;

    let currentPrompt = `Task: ${task.title}\n\n${task.description ?? ''}`;

    while (stepIndex < this.maxSteps) {
      let llmResponse: LLMResponse;
      try {
        const config: LLMConfig = {
          provider: agent.provider,
          model: agent.model,
          apiKey: process.env[`${agent.provider.toUpperCase()}_API_KEY`],
        };
        llmResponse = await callLLM(currentPrompt, systemPrompt, config);
      } catch (e) {
        this.recordFailureSync(runId, stepIndex, String(e));
        return { success: false, error: String(e), cost: totalCost };
      }

      const stepId = uuidv4();
      dbq.insert('step_attempts', {
        id: stepId, run_id: runId, step_index: stepIndex,
        thought: llmResponse.thought, action: null, action_args: '{}',
        observation: null, error: null, started_at: Date.now(), completed_at: null,
      });

      memoryTree.pushStep(runId, llmResponse.thought, '', '');
      sseBroadcaster.broadcast('run:progress', { runId, stepIndex, thought: llmResponse.thought });

      if (llmResponse.isDone) {
        dbq.update('runs', { state: 'DONE', completed_at: Date.now(), cost: totalCost }, { id: runId });
        await memoryTree.updateAgentLongTerm(agent.id, { id: runId } as any, true);
        sseBroadcaster.broadcast('run:completed', { runId, cost: totalCost, durationMs: Date.now() - startTime });
        return { success: true, cost: totalCost };
      }

      for (const tc of llmResponse.toolCalls) {
        const toolResult = await this.executeTool(tc.name, tc.arguments);
        currentPrompt += `\n\n[${tc.name}] → ${JSON.stringify(toolResult)}`;
        dbq.update('step_attempts', {
          action: tc.name, action_args: JSON.stringify(tc.arguments), observation: JSON.stringify(toolResult)
        }, { id: stepId });
      }

      stepIndex++;
    }

    const err = 'Max steps exceeded';
    this.recordFailureSync(runId, stepIndex, err);
    return { success: false, error: err, cost: totalCost };
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    if (name === 'bash' || name === 'shell') {
      const cmd = (args.command ?? args.cmd ?? '') as string;
      const sandboxId = args.sandboxId as string;
      if (!sandboxId) return { tool: name, success: false, error: 'No sandboxId' };
      try {
        const result = await execInSandbox(sandboxId, cmd);
        return { tool: name, success: result.exitCode === 0, result };
      } catch (e) {
        return { tool: name, success: false, error: String(e) };
      }
    }
    // Route through MCP
    return mcpRegistry.routeTool(name, args);
  }

  private recordFailureSync(runId: string, stepIndex: number, error: string) {
    dbq.update('runs', { state: 'FAILED', completed_at: Date.now(), error }, { id: runId });
    dbq.insert('step_attempts', {
      id: uuidv4(), run_id: runId, step_index: stepIndex,
      thought: null, action: null, action_args: '{}', observation: null,
      error, started_at: Date.now(), completed_at: null,
    });
    sseBroadcaster.broadcast('run:failed', { runId, error, stepIndex });
  }
}

export const agentRunner = new AgentRunner();
