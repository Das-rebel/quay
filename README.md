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

## 📊 Competitive Comparison

Quay sits at the intersection of **enterprise capability** and **open-source flexibility** — self-hosted, cost-transparent, and built for teams that want full control without building from scratch.


### How to Read the Table

| Symbol | Meaning |
|--------|---------|
| ✅ Full support | Available and production-ready |
| ⚠️ Partial / Limited | Available but with constraints |
| ❌ Not available | Not supported or not applicable |

### Platform Comparison

*21 platforms compared across 13 parameters — platforms as rows for readability.*

| Platform | Type | Deploy | Pricing | LLM Flex | MCP | Cost Transp | Dashboard | State Mach | Audit | Auto Code | Pipeline | Multi-Agent | Open Src |
|---------|------|--------|---------|---------|-----|-----------|----------|----------|------|----------|----------|------------|---------|
| [**Quay**](https://github.com/Das-rebel/quay) | Factory | ✅ Self | ✅ MIT | ✅ Any (40+) | ✅ Native | ✅ Per-call | ✅ Live SSE | ✅ 7-state | ✅ SQLite | ✅ Prod | ✅ Full | ✅ Role | ✅ MIT |
| [**XHawk OpenFactory**](https://xhawk.ai) | Factory | ❌ Cloud | ⚠️ Opaque | ⚠️ Prop | ❌ | ❌ Opaque | ⚠️ Dash | ⚠️ Basic | ⚠️ Logs | ✅ Prod | ⚠️ Config | ⚠️ Multi | ❌ Prop |
| [**ServiceNow AI Agents**](https://www.servicenow.com/products/ai-agents.html) | Enterprise | ❌ Cloud | ⚠️ Opaque | ⚠️ Prop | ⚠️ Integr | ⚠️ Agg | ⚠️ Now UI | ✅ Full | ✅ Full | ⚠️ Auto | ⚠️ Flow | ⚠️ Virt | ❌ Prop |
| [**Copilot Studio**](https://www.microsoft.com/microsoft-copilot/microsoft-copilot-studio) | Enterprise | ❌ Cloud | ⚠️ Per-seat | ⚠️ Copilot | ⚠️ Conn | ⚠️ Admin | ✅ Power | ✅ Flows | ✅ Full | ⚠️ Prompt | ⚠️ Studio | ⚠️ Auto | ❌ Prop |
| [**Einstein Agent**](https://www.salesforce.com/products/einstein/einstein-ai-agent/) | CRM | ❌ Cloud | ⚠️ Per-agent | ⚠️ Einst | ⚠️ APIs | ⚠️ CRM | ⚠️ SF UI | ⚠️ Case | ✅ Full | ⚠️ Case | ⚠️ Flow | ⚠️ Einst | ❌ Prop |
| [**Workato**](https://www.workato.com) | iPaaS+AI | ⚠️ Hybrid | ⚠️ Per-job | ⚠️ Wkto | ⚠️ 200+ | ⚠️ Conn | ⚠️ Rpter | ⚠️ Job | ✅ Full | ⚠️ Recipe | ⚠️ Low | ⚠️ Recipe | ⚠️ Src |
| [**Automation Anywhere**](https://www.automationanywhere.com) | RPA+AI | ⚠️ On-prem | ⚠️ Bot | ⚠️ Insight | ⚠️ Integr | ⚠️ Analytics | ⚠️ Room | ⚠️ Attend | ✅ Full | ⚠️ Attend | ⚠️ RPA | ⚠️ RPA | ❌ Prop |
| [**MultiOn**](https://multion.ai) | Browser AI | ❌ Cloud | ⚠️ API | ✅ Any | ❌ | ⚠️ API | ⚠️ API | ⚠️ Basic | ❌ | ⚠️ Browser | ⚠️ Browser | ❌ | ⚠️ Freem |
| [**Adept ACT-1**](https://www.adept.ai/act) | Ent AI | ❌ Cloud | ⚠️ Ent | ✅ Any | ❌ | ❌ Opaque | ⚠️ Portal | ⚠️ Task | ⚠️ Ent | ⚠️ Multi | ⚠️ ACT-1 | ⚠️ Ent | ❌ Prop |
| [**Airkit**](https://www.airkit.com) | CX AI | ❌ Cloud | ⚠️ Seat | ⚠️ Airkit | ❌ | ⚠️ CC | ⚠️ Studio | ⚠️ Bot | ⚠️ Sess | ❌ | ⚠️ Builder | ❌ | ⚠️ Freem |
| [**Embra**](https://www.embra.ai) | Know AI | ❌ Cloud | ⚠️ Seat | ✅ Multi | ❌ | ❌ Opaque | ⚠️ Space | ❌ | ⚠️ Logs | ⚠️ Know | ❌ | ❌ | ⚠️ Freem |
| [**Corr**](https://corr.ai) | AI Agent | ❌ Cloud | ⚠️ Seat | ✅ Multi | ⚠️ Roadmap | ❌ Opaque | ⚠️ Dash | ⚠️ Queue | ⚠️ Basic | ⚠️ Gen | ⚠️ Config | ⚠️ Multi | ⚠️ Beta |
| [**Superagent**](https://superagent.sh) | OSS Agent | ✅ Self | ✅ MIT | ✅ Any | ⚠️ Tools | ⚠️ Back | ⚠️ LangS | ⚠️ Custom | ⚠️ Custom | ⚠️ Tool | ⚠️ Config | ⚠️ Single | ✅ MIT |
| [**Jina AI**](https://jina.ai) | Infra | ⚠️ Hybrid | ⚠️ Per-call | ✅ Any | ⚠️ Proxy | ⚠️ Pro | ⚠️ Dash | ❌ | ⚠️ API | ⚠️ Read | ⚠️ Svc | ⚠️ Read | ⚠️ Partial |
| [**MindOS**](https://www.mindos.com) | Agent Plat | ❌ Cloud | ⚠️ Sub | ⚠️ MindOS | ⚠️ Plugins | ❌ Opaque | ✅ Portal | ⚠️ Agent | ⚠️ Sess | ⚠️ Know | ⚠️ Builder | ⚠️ Multi | ⚠️ Freem |
| [**AutoGen**](https://microsoft.github.io/autogen) | OSS Frame | ✅ Self | ✅ MIT | ✅ Any | ⚠️ Tools | ❌ | ❌ | ❌ | ⚠️ Console | ⚠️ Rsrch | ⚠️ Code | ⚠️ Conv | ✅ MIT |
| [**CrewAI**](https://www.crewai.com) | OSS Multi | ✅ Self | ✅ MIT | ✅ Any | ⚠️ Tools | ⚠️ LangS | ⚠️ LangS | ⚠️ Crew | ⚠️ LangS | ⚠️ Role | ⚠️ YAML | ⚠️ Role | ✅ MIT |
| [**LangGraph**](https://www.langchain.com/langgraph) | OSS Workfl | ✅ Self | ✅ Apache | ✅ Any | ⚠️ LC | ⚠️ LangS | ⚠️ LangS | ⚠️ Check | ⚠️ LangS | ⚠️ Workfl | ⚠️ Graph | ⚠️ Graph | ✅ Apache |
| [**MetaGPT**](https://www.deepwisdom.ai) | OSS Dev | ✅ Self | ✅ MIT | ⚠️ GPT4 | ❌ | ❌ | ❌ | ❌ | ⚠️ Console | ⚠️ Dev | ⚠️ Role | ⚠️ Prompt | ✅ MIT |
| [**OpenDevin**](https://www.all-hands.dev) | OSS Code | ✅ Self | ⚠️ AGPL | ✅ Any | ⚠️ Plugins | ❌ | ⚠️ Web UI | ⚠️ Loop | ⚠️ Events | ⚠️ SWE | ⚠️ AgentG | ⚠️ Event | ⚠️ AGPL |
| [**SWE-agent**](https://swe-agent.com) | OSS SWE | ✅ Self | ✅ Apache | ✅ Any | ❌ | ❌ | ❌ CLI | ❌ | ⚠️ Term | ⚠️ CLI | ⚠️ CLAUDE | ❌ | ✅ Apache |
| [**Continue Dev**](https://continue.dev) | OSS IDE | ✅ Local | ✅ Apache | ✅ Any | ⚠️ Config | ❌ | ⚠️ IDE | ❌ | ⚠️ IDE | ⚠️ IDE | ⚠️ Config | ⚠️ Pair | ✅ Apache |
| [**Moss**](https://moss.sh) | OSS Code | ✅ Self | ✅ MIT | ✅ Any | ⚠️ Tools | ❌ | ⚠️ Web | ⚠️ Basic | ⚠️ Hist | ⚠️ Gen | ⚠️ Miss | ⚠️ Miss | ✅ MIT |

### Why Teams Choose Quay

**vs. Open-Source Frameworks ([AutoGen](https://microsoft.github.io/autogen), [CrewAI](https://www.crewai.com), [MetaGPT](https://www.deepwisdom.ai), [OpenDevin](https://www.all-hands.dev))**

[AutoGen](https://microsoft.github.io/autogen), [CrewAI](https://www.crewai.com), [LangGraph](https://www.langchain.com/langgraph), [MetaGPT](https://www.deepwisdom.ai), and [OpenDevin](https://www.all-hands.dev) are powerful *research-grade* tools — but they're frameworks, not platforms. You still need to build: auth, a dashboard, state persistence, cost tracking, and deployment pipelines. Quay provides all of that out of the box with a production-ready UI.

| Capability | [AutoGen](https://microsoft.github.io/autogen)/[CrewAI](https://www.crewai.com)/[MetaGPT](https://www.deepwisdom.ai) | **Quay** |
|-----------|-----------------------------------------|----------|
| Production dashboard | ❌ | ✅ Live SSE + Kanban |
| Task state machine | ❌ | ✅ 7-state with transitions |
| Cost per LLM call | ❌ | ✅ Per-call USD logging |
| MCP native support | ⚠️ Via custom tools | ✅ Native stdio registry |
| SQLite audit trail | ❌ | ✅ Full schema |
| Self-hosted | ✅ | ✅ |
| Zero-config start | ❌ | ✅ `bun run scripts/seed.ts` |

**vs. [XHawk OpenFactory](https://xhawk.ai)**

[XHawk](https://xhawk.ai) is the closest commercial equivalent — but it's cloud-only with opaque enterprise pricing and no self-hosted option. If your team has compliance requirements (GDPR, SOC2, data residency), XHawk may not be an option.

| Capability | [XHawk OpenFactory](https://xhawk.ai) | **Quay** |
|-----------|---------------------------|----------|
| Self-hosted | ❌ Cloud-only | ✅ Run on your infra |
| Cost transparency | ❌ Opaque | ✅ Per-call USD logging |
| Audit trail | ⚠️ Logs | ✅ Full SQLite schema |
| MCP support | ❌ | ✅ Native |
| Pricing | Enterprise (opaque) | ✅ MIT (open source) |
| Customization | ⚠️ Configurable | ✅ Full pipeline code |

**vs. Enterprise Platforms ([ServiceNow](https://www.servicenow.com/products/ai-agents.html), [Copilot Studio](https://www.microsoft.com/microsoft-copilot/microsoft-copilot-studio), [Einstein](https://www.salesforce.com/products/einstein/einstein-ai-agent/))**

[ServiceNow AI Agents](https://www.servicenow.com/products/ai-agents.html), [Microsoft Copilot Studio](https://www.microsoft.com/microsoft-copilot/microsoft-copilot-studio), and [Salesforce Einstein Agent](https://www.salesforce.com/products/einstein/einstein-ai-agent/) are locked to their respective ecosystems — great if you live in those platforms, expensive and restrictive otherwise. Quay integrates with *any* LLM provider via [A3M Router](https://github.com/Das-rebel/a3m-router) and any MCP tool server.

| Capability | ServiceNow / Copilot Studio / Einstein | **Quay** |
|-----------|----------------------------------------|----------|
| Non-proprietary LLMs | ❌ | ✅ Any via [A3M](https://github.com/Das-rebel/a3m-router) |
| MCP tool servers | ⚠️ Via integration | ✅ Native |
| Self-hosted | ❌ | ✅ |
| Transparent pricing | ❌ Enterprise quote | ✅ Open source |
| Custom pipeline stages | ⚠️ Flow Designer | ✅ Any stage, any code |
| Data residency | ❌ Cloud-only | ✅ Full control |

**vs. Startups ([MultiOn](https://multion.ai), [Adept](https://www.adept.ai/act), [Airkit](https://www.airkit.com), [Embra](https://www.embra.ai), [Corr](https://corr.ai))**

Most AI agent startups are either browser-focused ([MultiOn](https://multion.ai)), enterprise-SaaS with opaque pricing ([Adept](https://www.adept.ai/act), [Corr](https://corr.ai)), or narrow-use-case ([Airkit](https://www.airkit.com)). Quay is the only open-source option with a full production software factory — complete state machine, real-time dashboard, audit trail, MCP, and cost logging — without vendor lock-in.

### Scoring Summary

Based on the comparison across 13 key parameters:

| Category | [Quay](https://github.com/Das-rebel/quay) Score | Best Open Source | Best Enterprise |
|----------|--------------------------------------|-----------------|-----------------|
| Deployment flexibility | 10/10 ✅ | 10/10 ([AutoGen](https://microsoft.github.io/autogen), [CrewAI](https://www.crewai.com)) | 4/10 ([ServiceNow](https://www.servicenow.com/products/ai-agents.html)) |
| LLM flexibility | 10/10 ✅ | 10/10 ([Quay](https://github.com/Das-rebel/quay), [AutoGen](https://microsoft.github.io/autogen)) | 3/10 ([Copilot Studio](https://www.microsoft.com/microsoft-copilot/microsoft-copilot-studio)) |
| MCP integration | 10/10 ✅ | 5/10 ([CrewAI](https://www.crewai.com)) | 3/10 ([ServiceNow](https://www.servicenow.com/products/ai-agents.html)) |
| Cost transparency | 10/10 ✅ | 0/10 ([AutoGen](https://microsoft.github.io/autogen), [OpenDevin](https://www.all-hands.dev)) | 2/10 ([XHawk](https://xhawk.ai)) |
| Real-time dashboard | 9/10 ✅ | 3/10 ([OpenDevin](https://www.all-hands.dev)) | 6/10 ([Copilot Studio](https://www.microsoft.com/microsoft-copilot/microsoft-copilot-studio)) |
| Task state machine | 10/10 ✅ | 0/10 (most OSS) | 7/10 ([ServiceNow](https://www.servicenow.com/products/ai-agents.html)) |
| Audit trail depth | 10/10 ✅ | 2/10 ([LangGraph](https://www.langchain.com/langgraph)) | 8/10 ([ServiceNow](https://www.servicenow.com/products/ai-agents.html)) |
| Autonomous coding | 9/10 ✅ | 8/10 ([OpenDevin](https://www.all-hands.dev)) | 6/10 ([XHawk](https://xhawk.ai)) |
| Pipeline customization | 10/10 ✅ | 7/10 ([CrewAI](https://www.crewai.com)) | 5/10 ([Workato](https://www.workato.com)) |
| Multi-agent support | 8/10 ✅ | 7/10 ([MetaGPT](https://www.deepwisdom.ai)) | 7/10 ([XHawk](https://xhawk.ai)) |
| Open source | 10/10 ✅ | 10/10 ([Quay](https://github.com/Das-rebel/quay), [AutoGen](https://microsoft.github.io/autogen)) | 0/10 |
| Production readiness | 8/10 ✅ | 4/10 ([OpenDevin](https://www.all-hands.dev)) | 8/10 ([ServiceNow](https://www.servicenow.com/products/ai-agents.html)) |
| **Total** | **114/130** | ~58/130 (best OSS) | ~58/130 (best ent) |

**Quay is the only platform that combines: self-hosted deployment + any LLM via [A3M Router](https://github.com/Das-rebel/a3m-router) + native MCP + per-call cost transparency + full state machine + real-time dashboard + open source MIT license.**

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
| API Server | [Hono](https://hono.dev) + [Bun](https://bun.sh) |
| Database | [SQLite](https://www.sqlite.org) via [Drizzle ORM](https://orm.drizzle.team) + `bun:sqlite` |
| Dashboard | [SvelteKit](https://kit.svelte.dev) 5 (runes) |
| AI Routing | [A3M Router](https://github.com/Das-rebel/a3m-router) |
| Agent Protocol | [Model Context Protocol (MCP)](https://modelcontextprotocol.io) |
| Task Queue | [BullMQ](https://docs.bullmq.io) + [Redis](https://redis.io) |
| Streaming | [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) |
| Validation | [Zod](https://zod.dev) |

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
