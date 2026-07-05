// ============================================================
// Quay — MCP Server Registry & Tool Gateway
// VOTED #1 — MCP as the primary tool integration layer
// ============================================================

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { MCPServerConfig, MCPTool } from '../../lib/types/index.js';

// ----------------------------------------------------------------
// MCP Tool Call Request/Response
// ----------------------------------------------------------------

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  tool: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

// ----------------------------------------------------------------
// MCP Server (stdio-based process)
// ----------------------------------------------------------------

export class MCPServer extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (v: unknown) => void }>();
  private ready = false;
  private buffer = '';

  constructor(
    private config: MCPServerConfig,
    private tools: MCPTool[] = []
  ) {
    super();
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.config.command, this.config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...this.config.env },
      });

      this.process.stdout?.on('data', (data: Buffer) => this.handleData(data.toString()));
      this.process.stderr?.on('data', (data: Buffer) => {
        // Log MCP server stderr but don't fail
        console.error(`[MCP ${this.config.name} stderr]`, data.toString().trim());
      });

      this.process.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });

      this.process.on('exit', (code) => {
        this.ready = false;
        this.emit('exit', code);
      });

      // Initialize: send capabilities
      this.send({ jsonrpc: '2.0', id: 0, method: 'initialize', params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'quay', version: '0.1.0' },
      }});

      // Resolve once we get the response
      const timeout = setTimeout(() => reject(new Error(`MCP server ${this.config.name} init timeout`)), 10000);
      this.once('ready', () => { clearTimeout(timeout); resolve(); });
    });
  }

  private send(msg: object) {
    const line = JSON.stringify(msg) + '\n';
    this.process?.stdin?.write(line);
  }

  private handleData(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        this.dispatch(msg);
      } catch (e) {
        console.error('[MCP parse error]', line);
      }
    }
  }

  private dispatch(msg: Record<string, unknown>) {
    if (msg.id !== undefined && this.pending.has(Number(msg.id))) {
      const p = this.pending.get(Number(msg.id))!;
      this.pending.delete(Number(msg.id));
      if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
      else p.resolve(msg.result);
    }

    // Handle server-sent notifications
    if (msg.method === 'notifications/initialized') {
      this.ready = true;
      this.emit('ready');
    }

    if (msg.method === 'tools/list') {
      const params = msg.params as { tools?: MCPTool[] } | undefined;
      this.emit('tools:updated', params?.tools ?? []);
    }
  }

  async callTool(tool: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.ready) throw new Error(`MCP server ${this.config.name} not ready`);

    const id = ++this.requestId;
    this.send({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: tool,
        arguments: args,
      },
    });

    try {
      const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
        this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject: reject as (v: unknown) => void });
        setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`MCP tool call ${tool} timed out after 60s`));
        }, 60000);
      });

      return { tool, success: true, result };
    } catch (e) {
      return { tool, success: false, error: String(e) };
    }
  }

  async listTools(): Promise<MCPTool[]> {
    const id = ++this.requestId;
    this.send({
      jsonrpc: '2.0',
      id,
      method: 'tools/list',
      params: {},
    });

    const result = await new Promise<{ tools: MCPTool[] }>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      setTimeout(() => { this.pending.delete(id); reject(new Error('timeout')); }, 10000);
    });

    return result.tools ?? [];
  }

  stop() {
    this.process?.kill();
    this.process = null;
    this.ready = false;
  }

  isReady() { return this.ready; }
}

// ----------------------------------------------------------------
// MCP Registry — manages all tool servers
// ----------------------------------------------------------------

export class MCPRegistry extends EventEmitter {
  private servers = new Map<string, MCPServer>();

  // Default tool servers — empty for MVP (configure via env or manual registration)
  private defaultServers: MCPServerConfig[] = [];

  async startAll(): Promise<void> {
    for (const config of this.defaultServers) {
      await this.register(config);
    }
  }

  async register(config: MCPServerConfig): Promise<MCPServer> {
    const server = new MCPServer(config);
    server.on('error', (err) => {
      console.error(`[MCPRegistry] server ${config.name} error:`, err.message);
    });
    server.on('exit', (code) => {
      console.warn(`[MCPRegistry] server ${config.name} exited with code ${code}`);
      this.servers.delete(config.name);
    });

    try {
      await server.start();
      this.servers.set(config.name, server);
      console.log(`[MCPRegistry] ✓ ${config.name} started`);
    } catch (e) {
      console.warn(`[MCPRegistry] ✗ ${config.name} failed to start:`, e);
    }

    return server;
  }

  async callTool(serverName: string, tool: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const server = this.servers.get(serverName);
    if (!server) throw new Error(`Unknown MCP server: ${serverName}`);
    return server.callTool(tool, args);
  }

  // Route a tool call to the right server by prefix "server::tool" or just "tool"
  async routeTool(fullToolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (fullToolName.includes('::')) {
      const [server, tool] = fullToolName.split('::');
      return this.callTool(server, tool, args);
    }

    // Search all servers for the tool
    for (const [name, server] of this.servers) {
      const tools = await server.listTools();
      if (tools.find(t => t.name === fullToolName)) {
        return server.callTool(fullToolName, args);
      }
    }
    return { tool: fullToolName, success: false, error: 'Tool not found in any registered server' };
  }

  getServer(name: string) { return this.servers.get(name); }
  getAllServers() { return [...this.servers.values()]; }
  getAllTools(): Promise<MCPTool[]> {
    return Promise.all([...this.servers.values()].map(s => s.listTools())).then(results =>
      results.flat()
    );
  }

  stopAll() {
    for (const server of this.servers.values()) server.stop();
    this.servers.clear();
  }
}

// Singleton registry
export const mcpRegistry = new MCPRegistry();
