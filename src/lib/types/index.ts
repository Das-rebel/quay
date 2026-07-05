// ============================================================
// Quay — Core Type Definitions
// ============================================================

// ----------------------------------------------------------------
// Projects & Tasks
// ----------------------------------------------------------------

export type TaskState =
  | 'BACKLOG'
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE'
  | 'FAILED'
  | 'BLOCKED';

export type TaskEvent =
  | 'SUBMIT'
  | 'ASSIGN'
  | 'STEP_COMPLETE'
  | 'APPROVE'
  | 'REJECT'
  | 'RETRY'
  | 'TIMEOUT'
  | 'UNBLOCK'
  | 'CANCEL';

export type SchedulingPolicy = 'SHORTEST_JOB_FIRST' | 'FAIR_SHARE' | 'STRICT_PRIORITY';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  state: TaskState;
  priority: number; // 1–10, user signal
  schedulingPolicy: SchedulingPolicy;
  assignedAgentId: string | null;
  correlationId: string | null; // groups parallel runs
  parentTaskId: string | null;  // for fan-out tasks
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

// ----------------------------------------------------------------
// Agents
// ----------------------------------------------------------------

export type AgentType =
  | 'CODER'
  | 'REVIEWER'
  | 'SECURITY'
  | 'ARCHITECT'
  | 'QA'
  | 'DEPLOYER'
  | 'RESEARCHER';

export type AgentStatus = 'IDLE' | 'BUSY' | 'OFFLINE' | 'ERROR';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  provider: string;       // 'openai' | 'anthropic' | 'groq' | etc.
  model: string;          // 'claude-sonnet-4-5' | 'gpt-4o' | etc.
  status: AgentStatus;
  capacity: number;       // max concurrent runs
  poolSize: number;       // number of physical instances
  config: Record<string, unknown>; // MCP tools, instructions, etc.
  createdAt: number;
}

// ----------------------------------------------------------------
// Runs (one per agent-task execution)
// ----------------------------------------------------------------

export type RunState = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';

export interface Run {
  id: string;
  taskId: string;
  agentId: string;
  state: RunState;
  correlationId: string | null; // groups parallel runs on same task
  sandboxId: string | null;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  cost: number;            // tokens spent (USD)
  tokensIn: number;
  tokensOut: number;
}

// ----------------------------------------------------------------
// Step Attempts (retry granularity within a Run)
// ----------------------------------------------------------------

export interface StepAttempt {
  id: string;
  runId: string;
  stepIndex: number;
  thought: string | null;  // LLM reasoning
  action: string | null;   // tool name called
  actionArgs: Record<string, unknown> | null;
  observation: string | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

// ----------------------------------------------------------------
// Sandbox
// ----------------------------------------------------------------

export type SandboxType = 'DOCKER' | 'E2B' | 'LOCAL';

export interface Sandbox {
  id: string;
  runId: string;
  type: SandboxType;
  status: 'PENDING' | 'READY' | 'RUNNING' | 'DONE' | 'ERROR';
  endpoint: string | null;  // URL to sandbox control plane
  createdAt: number;
}

// ----------------------------------------------------------------
// Projects
// ----------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  repoUrl: string | null;
  description: string | null;
  createdAt: number;
}

// ----------------------------------------------------------------
// Audit Events (append-only)
// ----------------------------------------------------------------

export type AuditEventType =
  | 'TASK_CREATED'
  | 'TASK_STATE_CHANGE'
  | 'RUN_STARTED'
  | 'RUN_COMPLETED'
  | 'RUN_FAILED'
  | 'AGENT_ASSIGNED'
  | 'AGENT_ERROR'
  | 'SANDBOX_CREATED'
  | 'TOOL_CALL'
  | 'HUMAN_INPUT';         // human unblocked a task

export interface AuditEvent {
  id: string;
  runId: string | null;
  taskId: string | null;
  agentId: string | null;
  type: AuditEventType;
  payload: Record<string, unknown>; // JSON blob
  actorId: string | null;            // user who triggered (null = agent)
  timestamp: number;
}

// ----------------------------------------------------------------
// Transitions (explicit state machine log)
// ----------------------------------------------------------------

export interface Transition {
  id: string;
  taskId: string;
  fromState: TaskState;
  toState: TaskState;
  triggeredBy: string | null;   // agent_id or user_id
  event: TaskEvent;
  payload: Record<string, unknown>;
  timestamp: number;
}

// ----------------------------------------------------------------
// MCP Tool Definitions
// ----------------------------------------------------------------

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ----------------------------------------------------------------
// SSE Event Types (for real-time dashboard)
// ----------------------------------------------------------------

export type SSEEventType =
  | 'task:created'
  | 'task:state_change'
  | 'run:started'
  | 'run:progress'
  | 'run:completed'
  | 'run:failed'
  | 'agent:status'
  | 'sandbox:status'
  | 'sse:heartbeat';

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

// ----------------------------------------------------------------
// Pipeline Definitions
// ----------------------------------------------------------------

export interface PipelineStage {
  id: string;
  name: string;
  agentType: AgentType;
  instructions: string;   // system prompt for this stage
  tools: string[];         // enabled MCP tool names
  requiresApproval: boolean; // human gate
  timeoutMs: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  description: string;
}

// ----------------------------------------------------------------
// MCP Server Types (Stdio)
// ----------------------------------------------------------------

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// ----------------------------------------------------------------
// Dashboard View Types
// ----------------------------------------------------------------

export interface DashboardStats {
  totalTasks: number;
  tasksByState: Record<TaskState, number>;
  activeAgents: number;
  totalAgents: number;
  totalRunsToday: number;
  totalCostToday: number;
  avgLatencyMs: number;
  uptimeSeconds: number;
}

export interface KanbanColumn {
  state: TaskState;
  label: string;
  tasks: Task[];
}
