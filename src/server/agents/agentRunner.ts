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
  temperature?: number;
}

export interface LLMResponse {
  thought: string;
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
  isDone: boolean;
  finalAnswer?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

async function callLLM(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig,
  maxTokens = 4096
): Promise<LLMResponse> {
  // baseURL must come from agent config — no magic URL construction
  if (!config.baseURL) {
    throw new Error(`No baseURL configured for provider ${config.provider}. Set baseURL in agent config or QUAY_DEFAULT_LLM_URL env var.`);
  }

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
    temperature: config.temperature ?? 0.2,
  };

  const url = `${config.baseURL}/v1/chat/completions`;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const content = data.choices[0]?.message?.content ?? '';

  // Parse tool calls from <tool_call> XML tags
  const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
  const toolRegex = /<tool_call>\s*<name>([\w:]+)<\/name>\s*<args>([\s\S]*?)<\/args>\s*<\/tool_call>/g;
  let match;
  while ((match = toolRegex.exec(content)) !== null) {
    try { toolCalls.push({ name: match[1], arguments: JSON.parse(match[2]) }); } catch { /* skip malformed */ }
  }

  const isDone = content.includes('<done>') || toolCalls.length === 0;
  const thought = content.split('<tool_call>')[0].trim();

  return {
    thought,
    toolCalls,
    isDone,
    finalAnswer: isDone ? content : undefined,
    usage: data.usage ? {
      inputTokens: data.usage.prompt_tokens ?? 0,
      outputTokens: data.usage.completion_tokens ?? 0,
    } : undefined,
  };
}

// ----------------------------------------------------------------
// Sandbox Execution (Docker via HTTP)
// Looks up sandbox endpoint from DB instead of using env var
// ----------------------------------------------------------------

interface SandboxExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function execInSandbox(sandboxId: string, command: string): Promise<SandboxExecResult> {
  // Look up sandbox endpoint from DB — do NOT use hardcoded SANDBOX_URL
  const [sandbox] = dbq.select<{ id: string; endpoint: string | null; status: string }>('sandboxes', { id: sandboxId });
  if (!sandbox) throw new Error(`Sandbox not found: ${sandboxId}`);
  if (!sandbox.endpoint) throw new Error(`Sandbox endpoint not set: ${sandboxId}`);

  const res = await fetch(`${sandbox.endpoint}/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, timeout: 300 }),
  });
  if (!res.ok) throw new Error(`Sandbox exec failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<SandboxExecResult>;
}

// ----------------------------------------------------------------
// Model Pricing for Cost Tracking
// ----------------------------------------------------------------

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-3-5-sonnet-latest': { input: 3, output: 15 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-haiku-latest': { input: 0.8, output: 4 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  // Groq
  'llama-3.3-70b-versatile': { input: 0.2, output: 0.2 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  // Ollama (local — free)
  'llama3': { input: 0, output: 0 },
  'llama3.1': { input: 0, output: 0 },
  'codellama': { input: 0, output: 0 },
  'qwen2.5-coder': { input: 0, output: 0 },
  'qwen2.5': { input: 0, output: 0 },
  // Google
  'gemini-2.5-flash': { input: 0.1, output: 0.4 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  // Zhipu
  'glm-4': { input: 0.1, output: 0.3 },
  'glm-4-flash': { input: 0.0, output: 0.0 },
  'glm-5': { input: 0.5, output: 1.5 },
};

function modelPrice(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] ?? { input: 0, output: 0 };
}

function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = modelPrice(model);
  return (tokensIn * p.input + tokensOut * p.output) / 1_000_000;
}

// ----------------------------------------------------------------
// Agent Runner
// ----------------------------------------------------------------

export class AgentRunner {
  maxSteps = 20;

  async run(
    task: { id: string; title: string; description?: string },
    agent: { id: string; name: string; type: string; provider: string; model: string; config: string },
    runId: string,
    instructions: string,
    allowedTools: string[],
  ): Promise<{ success: boolean; error?: string; cost: number; tokensIn: number; tokensOut: number }> {
    const startTime = Date.now();
    let totalCost = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let stepIndex = 0;

    // Parse agent config for baseURL and temperature
    let agentConfig: Record<string, unknown> = {};
    try { agentConfig = JSON.parse(agent.config); } catch { /* use defaults */ }

    const systemPrompt = `You are ${agent.name}, a ${agent.type} agent.\n\n${instructions}\n\nYou have access to these tools. Use them to complete the task.\n\nWhen you use a tool, respond ONLY with:\n<tool_call>\n<name>tool_name</name>\n<args>{"key": "value"}</args>\n</tool_call>\n\n1. Tool calls in <tool_call><name>tool</name><args>{"key":"value"}</args></tool_call>\n3. When done: <done>your_answer</done>`;

    let currentPrompt = `Task: ${task.title}\n\n${task.description ?? ''}`;

    while (stepIndex < this.maxSteps) {
      let llmResponse: LLMResponse;
      try {
        // baseURL from agent config (required) — no magic URL construction
        const config: LLMConfig = {
          provider: agent.provider,
          model: agent.model,
          apiKey: process.env[`${agent.provider.toUpperCase()}_API_KEY`],
          baseURL: agentConfig.baseURL as string | undefined
            ?? process.env.QUAY_DEFAULT_LLM_URL,
          temperature: agentConfig.temperature as number | undefined,
        };
        llmResponse = await callLLM(currentPrompt, systemPrompt, config);
      } catch (e) {
        this.recordFailureSync(runId, stepIndex, String(e));
        return { success: false, error: String(e), cost: totalCost, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
      }

      // Track cost from usage if available
      if (llmResponse.usage) {
        totalTokensIn += llmResponse.usage.inputTokens;
        totalTokensOut += llmResponse.usage.outputTokens;
        totalCost += calculateCost(agent.model, llmResponse.usage.inputTokens, llmResponse.usage.outputTokens);
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
        dbq.update('runs', {
          state: 'DONE',
          completed_at: Date.now(),
          cost: totalCost,
          tokens_in: totalTokensIn,
          tokens_out: totalTokensOut,
        }, { id: runId });
        await memoryTree.updateAgentLongTerm(agent.id, { id: runId } as any, true);
        sseBroadcaster.broadcast('run:completed', { runId, cost: totalCost, durationMs: Date.now() - startTime });
        return { success: true, cost: totalCost, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
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
    return { success: false, error: err, cost: totalCost, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
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
