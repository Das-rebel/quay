# Quay — Autonomous AI Software Factory

> Self-hosted AI agents that plan, code, review, security-scan, and deploy — with full cost transparency and an open architecture.

[![CI](https://github.com/Das-rebel/quay/actions/workflows/ci.yml/badge.svg)](https://github.com/Das-rebel/quay/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![npm: v0.0.1](https://img.shields.io/badge/npm-v0.0.1-purple.svg)](https://www.npmjs.com/package/quay)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-ff3e00.svg)](https://svelte.dev/)

**Quay** is an open-source AI Software Factory — a platform for orchestrating autonomous AI agents through customizable pipelines. Agents write code, run reviews, perform security scans, and produce deployable artifacts — all with an open, self-hosted architecture and real-time observability.

---

## ✨ Features

### 🤖 Autonomous Agent Pipelines
- **Role-based agents**: Engineer → Reviewer → Security → Deployer pipeline out of the box
- **Customizable stages**: Swap, add, or remove pipeline stages to match your workflow
- **SWE-agent loop**: Observe → Plan → Act → Reflect cycle with SQLite-backed step tracking

### 🔌 MCP Integration (Model Context Protocol)
- Connect any MCP-compatible tool server via stdio (filesystem, git, Slack, custom tools)
- First-class support for the Model Context Protocol — like USB for AI agents
- Lazy-loaded per pipeline stage; hot-reload on server restart

### 💰 Cost Transparency
- Every LLM call logged with token counts and cost in USD
- Per-task, per-project, and global cost dashboards
- Route through A3M Router for adaptive multi-provider routing (OpenAI, Anthropic, Groq, Ollama, and 40+ more)

### 🛡️ Self-Hosted & Open
- No vendor lock-in — run entirely on your own infrastructure
- Bearer-token auth with configurable `QUAY_API_KEY`
- Full audit trail: every state transition, every tool call, every run — logged to SQLite

### 📊 Mission Control Dashboard
- Real-time dark UI with KPI cards (success rate, active agents, pipeline health, daily cost)
- Kanban board (7 states: Backlog → Queued → In Progress → Review → Done / Failed / Blocked)
- Live activity feed via SSE streaming
- Mock/Live data toggle for development

### 🧠 Three-Tier Agent Memory
- **Short-term**: Per-run cache (30-minute TTL, in-memory Map)
- **Medium-term**: 7-day lessons learned per project
- **Long-term**: Agent capability/failure graph with success-rate weighting

### 📡 Real-Time Streaming
- Server-Sent Events for task lifecycle broadcasts
- WebSocket-ready architecture
- Zero polling — dashboard updates on every state change

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.0 or Node.js ≥ 18
- SQLite (built-in via `bun:sqlite`)

### Install

```bash
git clone https://github.com/Das-rebel/quay.git
cd quay
bun install
```

### Seed the Database

```bash
bun run scripts/seed.ts
```

### Start the API Server

```bash
bun run src/server/index.ts
# → http://localhost:3001
# → Health: http://localhost:3001/health
# → API key: quay-dev-key (development only)
```

### Start the Dashboard

```bash
npm run dev
# → http://localhost:5173
```

### Configure MCP Servers (optional)

```bash
export QUAY_MCP_SERVERS='[{"name":"filesystem","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp"]}]'
bun run src/server/index.ts
```

---

## 🏗️ Architecture

```
quay/
├── src/
│   ├── server/
│   │   ├── index.ts          # Hono API + auth middleware + all routes
│   │   ├── db/
│   │   │   ├── schema.ts     # Drizzle schema (7 tables)
│   │   │   └── index.ts      # bun:sqlite wrapper (dbq)
│   │   ├── agents/
│   │   │   └── agentRunner.ts # SWE-agent: observe→plan→act→reflect loop
│   │   ├── pipeline/
│   │   │   └── pipeline.ts   # Role-based executor: engineer→reviewer→security
│   │   ├── memory/
│   │   │   └── memoryTree.ts  # 3-tier memory + knowledge graph
│   │   ├── mcp/
│   │   │   └── index.ts       # MCP stdio registry + tools/call
│   │   └── sse/
│   │       └── index.ts       # SSE broadcaster + heartbeat
│   ├── routes/
│   │   └── +page.svelte      # Mission Control dashboard (dark UI)
│   └── lib/
│       └── stores/
│           └── quay.ts        # Svelte stores + API helpers
├── scripts/
│   └── seed.ts               # Seed script with sample project/tasks/agents
├── quay.db                    # SQLite database (gitignored)
└── drizzle.config.ts
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/sse` | SSE stream (no auth) |
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:id/tasks` | List tasks for project |
| `POST` | `/api/projects/:id/tasks` | Create task |
| `GET` | `/api/projects/:id/kanban` | Kanban view (7 columns) |
| `POST` | `/api/tasks/:id/transition` | Trigger state transition |
| `POST` | `/api/tasks/:id/run` | Run pipeline on task |
| `GET` | `/api/agents` | List all agents |
| `PATCH` | `/api/agents/:id/status` | Update agent status |
| `GET` | `/api/stats` | Global dashboard stats |
| `POST` | `/api/test-event` | Broadcast SSE test event |
| `GET` | `/api/mcp/tools` | List registered MCP tools |

### Task State Machine

```
BACKLOG → QUEUED → IN_PROGRESS → REVIEW → DONE
    ↓         ↓          ↓         ↓
  (SUBMIT) (ASSIGN) (STEP_COMPLETE) (APPROVE)
                  ↓              ↓
               FAILED ←←←←←←← (REJECT)
                  ↓
               (RETRY)
                  ↓
               QUEUED

BLOCKED ← (can block from REVIEW)
  ↓
(UNBLOCK) → QUEUED
```

---

## 🔧 Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `QUAY_API_KEY` | `quay-dev-key` | Bearer token for API auth |
| `QUAY_PORT` | `3001` | API server port |
| `QUAY_MCP_SERVERS` | `[]` | JSON array of MCP server configs |

### MCP Server Config Format

```json
[
  {
    "name": "filesystem",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  },
  {
    "name": "git",
    "command": "uvx",
    "args": ["mcp-server-git", "--repository", "/path/to/repo"]
  }
]
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| API Server | [Hono](https://hono.dev) + Bun |
| Database | SQLite via [Drizzle ORM](https://orm.drizzle.team) + `bun:sqlite` |
| Dashboard | [SvelteKit](https://kit.svelte.dev) 5 (runes) |
| AI Routing | [A3M Router](https://github.com/Das-rebel/a3m-router) |
| Agent Protocol | [Model Context Protocol (MCP)](https://modelcontextprotocol.io) |
| Task Queue | BullMQ + Redis |
| Streaming | Server-Sent Events (SSE) |
| Validation | Zod |

---

## 📈 Roadmap

- [ ] **v0.2** — MCP server registry UI in Mission Control
- [ ] **v0.3** — GitHub/GitLab webhook triggers for automatic task creation
- [ ] **v0.4** — Docker sandbox execution for agent isolation
- [ ] **v0.5** — Kubernetes operator for multi-tenant deployment
- [ ] **v1.0** — Production hardening: rate limiting, OAuth2, HA mode

---

## 🤝 Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/your-feature`)
3. Run tests (`bash scripts/test-quay.sh`)
4. Commit and push
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
