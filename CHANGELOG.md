# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-05

### Added
- **Autonomous Agent Pipelines** - Role-based agents (Engineer → Reviewer → Security → Deployer) with customizable stages
- **MCP Integration** - First-class Model Context Protocol support with stdio connection to any MCP-compatible tool server
- **Cost Transparency** - Every LLM call logged with token counts and cost in USD. Per-task, per-project, and global cost dashboards
- **Self-Hosted & Open** - No vendor lock-in, runs entirely on your own infrastructure with bearer-token auth
- **Mission Control Dashboard** - Real-time dark UI with KPI cards, Kanban board (7 states), and live activity feed via SSE streaming
- **Three-Tier Agent Memory** - Short-term (30-min TTL), medium-term (7-day lessons), long-term (capability/failure graph)
- **Real-Time Streaming** - Server-Sent Events for task lifecycle broadcasts, WebSocket-ready architecture
- **7-State Pipeline** - Full state machine: Backlog → Queued → In Progress → Review → Done / Failed / Blocked
- **SQLite Audit Trail** - Every state transition, tool call, and run logged to SQLite
- **A3M Router Integration** - Route through adaptive multi-provider routing (OpenAI, Anthropic, Groq, Ollama, 40+ providers)
- **SWE-Agent Loop** - Observe → Plan → Act → Reflect cycle with SQLite-backed step tracking

### Technical Stack
- TypeScript 5.6
- Svelte 5
- Bun runtime
- Drizzle ORM with SQLite
- Vite build system

### Documentation
- Comprehensive README with competitive comparison (21 platforms, 13 parameters)
- Platform vs. Open-Source Frameworks (AutoGen, CrewAI, MetaGPT, OpenDevin)
- Platform vs. Enterprise Solutions (ServiceNow, Copilot Studio, Einstein)
- Platform vs. Startups (MultiOn, Adept, Airkit, Embra, Corr)

### License
MIT License - fully open source with no vendor lock-in
