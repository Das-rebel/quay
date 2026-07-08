# Social Media Content for Quay Launch

---

## 🐦 Twitter/X Thread (5 Tweets)

**Tweet 1 (Launch Announcement):**
> 🧵 We're open-sourcing Quay today — a self-hosted AI Software Factory that actually ships to production.
> 
> No vendor lock-in. Full cost transparency. MCP native.
> 
> Let's dive in 🧵👇

**Tweet 2 (The Problem):**
> AutoGen, CrewAI, MetaGPT are powerful... but they're frameworks, not platforms.
> 
> You still need to build:
> - Auth & state persistence
> - A dashboard people will use
> - Cost tracking per LLM call
> - Deployment pipelines
> 
> That's months of work. We did it for you.

**Tweet 3 (The Solution):**
> Introducing Quay — an open-source AI Software Factory.
> 
> ✅ 7-state pipeline (Backlog → Done/Failed)
> ✅ Live SSE dashboard
> ✅ Per-call LLM cost in USD
> ✅ SQLite audit trail
> ✅ MCP native (git, filesystem, Slack...)
> ✅ Self-hosted, MIT licensed

**Tweet 4 (Demo Highlight):**
> Watch your agents work in real-time.
> 
> Every state transition. Every tool call. Every cent.
> 
> No more "which model was that?" or "why did it cost $50?"
> 
> 📊 mission-control.svc.studio

**Tweet 5 (Call to Action):**
> GitHub: github.com/Das-rebel/quay
> npm: npm install quay-ai-factory
> 
> ⭐ if you believe AI agents should be self-hosted and transparent.

---

## 💼 LinkedIn Post

**Title:** We Just Open-Sourced the AI Software Factory We Wish Existed

**Content:**
After months of building internal AI agents, we asked ourselves: why do we have to choose between powerful-but-complex frameworks (AutoGen, CrewAI) and expensive-but-managed platforms (ServiceNow, Copilot Studio)?

So we built Quay — an MIT-licensed AI Software Factory that gives you:

🔌 **MCP Native** — The USB standard for AI tools. Connect git, filesystem, Slack, or any custom tool server in minutes.

📊 **Cost Transparency** — Every LLM call logged with USD cost. Know exactly what each task costs before you run it.

🎛️ **Mission Control** — Real-time dashboard with SSE streaming. Watch your agents work in a 7-state Kanban board.

🛡️ **Full Audit Trail** — SQLite schema for every state transition, tool call, and run. Compliance-ready out of the box.

We're not competing with AutoGen or CrewAI — they solve research-grade problems. Quay solves production-grade problems.

The gap between "it works in Jupyter" and "it ships to production" is where most AI projects die. Quay bridges that.

Questions? Drop them below. 👇

GitHub: github.com/Das-rebel/quay
npm: npm install quay-ai-factory

#AIagents #OpenSource #MachineLearning #ArtificialIntelligence #LLM #AIAutomation

---

## 📺 Hacker News "Show HN" Post

**Title:** Show HN: Quay - Self-hosted AI Software Factory with MCP and per-call cost tracking

**Body:**
Hey HN!

We'd like to share Quay, an open-source AI Software Factory we've been building.

**The Problem We Solved:**
AutoGen, CrewAI, LangGraph are powerful frameworks — but they're not platforms. Building production AI agents requires:
- Auth & session management
- State persistence & recovery
- A dashboard teams will actually use
- Cost tracking per LLM call
- Deployment pipelines
- Audit trails for compliance

That's 6+ months of work on top of your AI logic.

**What Quay Does:**
Quay is an MIT-licensed autonomous AI agent platform with:
- Role-based agents: Engineer → Reviewer → Security → Deployer
- MCP native: Connect any Model Context Protocol tool server
- 7-state pipeline with live SSE dashboard
- Per-call LLM cost logging in USD
- SQLite audit trail for compliance
- Self-hosted — no vendor lock-in

**Stack:**
TypeScript, Svelte 5, Bun, Drizzle ORM, SQLite

**Links:**
- GitHub: github.com/Das-rebel/quay
- npm: npm install quay-ai-factory

Would love your feedback on the architecture and DX!

---

## 🤖 Reddit r/MachineLearning Post

**Title:** [P] Introducing Quay — Open-source AI Software Factory with MCP support and per-call cost tracking

**Body:**
Hey r/ML!

Sharing an open-source project we've been working on: **Quay**, an AI Software Factory for autonomous coding agents.

**Why we built it:**
Existing solutions left us with a gap:
- **Frameworks** (AutoGen, CrewAI, MetaGPT): Powerful but need months of platform work
- **Enterprise platforms** (ServiceNow, Copilot Studio): Expensive, cloud-only, proprietary LLMs

We wanted something self-hosted, transparent, and production-ready.

**What makes Quay different:**

🔌 **MCP Native** — Model Context Protocol is like USB for AI agents. Connect any MCP-compatible tool server (git, filesystem, Slack, custom) without writing glue code.

📊 **Cost Transparency** — Every LLM call logged with token count and USD cost. Per-task, per-project, global views.

🎛️ **Mission Control Dashboard** — Real-time SSE streaming into a 7-state Kanban (Backlog → Queued → In Progress → Review → Done/Failed/Blocked).

🛡️ **SQLite Audit Trail** — Full schema for compliance. Every state transition, tool call, run logged.

**Tech Stack:** TypeScript, Svelte 5, Bun, Drizzle ORM, SQLite

**Links:**
- GitHub: github.com/Das-rebel/quay
- npm: npm install quay-ai-factory

Would love feedback on the architecture and DX. Happy to answer questions!

---

## 📝 Medium/dev.to Article Outline

**Title:** Building a Production-Ready AI Software Factory with Quay

**Outline:**
1. Introduction - The gap between AI frameworks and production platforms
2. What is MCP and why it matters
3. Architecture overview - agent pipeline, MCP registry, SQLite audit trail
4. Real-time dashboard with SSE
5. Cost tracking in practice
6. Benchmarks vs AutoGen, CrewAI
7. Getting started guide
8. Roadmap

**CTA:** "Star on GitHub to follow our progress"
